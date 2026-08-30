const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

const PICT_LAT = 18.4584975;
const PICT_LON = 73.8512198;
const MAX_DISTANCE_KM = 2.0;
const MIN_ORDER_INTERVAL_MS = 30_000;
const MAX_ITEMS_PER_ORDER = 30;
const MAX_LINE_QUANTITY = 20;

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function requireAuth(context) {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in required.");
  }
  if (context.auth.token.firebase?.sign_in_provider === "anonymous") {
    throw new functions.https.HttpsError("permission-denied", "Anonymous users cannot place orders.");
  }
}

function getRazorpayConfig() {
  const cfg = functions.config().razorpay || {};
  const keyId = cfg.key_id || process.env.RAZORPAY_KEY_ID || "";
  const keySecret = cfg.key_secret || process.env.RAZORPAY_KEY_SECRET || "";
  const webhookSecret = cfg.webhook_secret || process.env.RAZORPAY_WEBHOOK_SECRET || "";
  return { keyId, keySecret, webhookSecret, enabled: Boolean(keyId && keySecret) };
}

function verifyRazorpaySignature(orderId, paymentId, signature, secret) {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return expected === signature;
}

async function validateAndPriceItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "Order must contain items.");
  }
  if (items.length > MAX_ITEMS_PER_ORDER) {
    throw new functions.https.HttpsError("invalid-argument", "Too many line items.");
  }

  let calculatedTotal = 0;
  const validatedItems = [];
  let allExpress = true;

  for (const item of items) {
    if (!item || typeof item.itemId !== "string") continue;
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid item quantity.");
    }

    const menuDoc = await db.collection("menuItems").doc(item.itemId).get();
    if (!menuDoc.exists) {
      throw new functions.https.HttpsError("not-found", `Item ${item.itemId} not found.`);
    }

    const menuData = menuDoc.data();
    if (menuData.isTest === true) {
      throw new functions.https.HttpsError("failed-precondition", "Test items are not orderable.");
    }
    if (!menuData.is_available) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Item ${menuData.name} is currently unavailable.`
      );
    }
    const price = Number(menuData.price);
    if (!Number.isFinite(price) || price <= 0) {
      throw new functions.https.HttpsError("failed-precondition", "Invalid menu price.");
    }
    if (!menuData.is_express) allExpress = false;

    calculatedTotal += price * quantity;
    validatedItems.push({
      itemId: item.itemId,
      name: menuData.name,
      price,
      quantity,
      is_express: Boolean(menuData.is_express),
    });
  }

  if (validatedItems.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "No valid items in the order.");
  }
  if (calculatedTotal <= 0) {
    throw new functions.https.HttpsError("invalid-argument", "Order total must be positive.");
  }

  return { validatedItems, calculatedTotal, allExpress };
}

function assertCampusLocation(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Campus location is required to place an order."
    );
  }
  const dist = distanceKm(lat, lon, PICT_LAT, PICT_LON);
  if (dist > MAX_DISTANCE_KM) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      `You must be within ${MAX_DISTANCE_KM}km of PICT campus to order.`
    );
  }
}

async function assertRateLimit(uid) {
  const userRef = db.collection("users").doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Complete registration before ordering."
    );
  }
  // Fix 4 — block unverified/rejected students from ordering
  if (snap.data().verificationStatus !== "verified") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Your student ID has not been verified yet. Please wait for staff review."
    );
  }
  const last = snap.data().lastOrderAt;
  if (last && typeof last.toMillis === "function") {
    if (Date.now() - last.toMillis() < MIN_ORDER_INTERVAL_MS) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "Please wait a moment before placing another order."
      );
    }
  }
  return userRef;
}

// Fix 7 — allowed values for scheduled_for field
const ALLOWED_SCHEDULED_VALUES = [null, "11:00 AM", "1:00 PM"];

// Fix 5 — atomically mark a UTR as used; rejects duplicate submissions
async function reserveUTR(utr) {
  const utrRef = db.collection("usedUTRs").doc(utr);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(utrRef);
    if (snap.exists) {
      throw new functions.https.HttpsError(
        "already-exists",
        "This UTR has already been used for a previous order."
      );
    }
    tx.set(utrRef, { used_at: admin.firestore.FieldValue.serverTimestamp() });
  });
}

async function allocateToken() {
  const counterRef = db.collection("metadata").doc("counter");
  return db.runTransaction(async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    let nextToken = 101;
    if (counterSnap.exists) {
      nextToken = Number(counterSnap.data().current_token || 100) + 1;
    }
    transaction.set(counterRef, { current_token: nextToken }, { merge: true });
    return nextToken;
  });
}

async function writeOrderAndBoard(orderPayload) {
  const orderRef = db.collection("orders").doc();
  const batch = db.batch();
  batch.set(orderRef, orderPayload);
  batch.set(db.collection("displayBoard").doc(orderRef.id), {
    token_number: orderPayload.token_number,
    status: orderPayload.status,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });
  batch.set(
    db.collection("users").doc(orderPayload.uid),
    { lastOrderAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
  await batch.commit();
  return orderRef.id;
}

/**
 * Public payment config for the client (key id only — never the secret).
 */
exports.getPaymentConfig = functions
  .runWith({ enforceAppCheck: true })
  .https.onCall(async (_data, context) => {
    requireAuth(context);
    const { keyId, enabled } = getRazorpayConfig();
    return {
      provider: enabled ? "razorpay" : "upi_manual",
      razorpayKeyId: enabled ? keyId : null,
    };
  });

/**
 * Create a Razorpay order when gateway credentials are configured.
 */
exports.createPaymentOrder = functions
  .runWith({ enforceAppCheck: true })
  .https.onCall(async (data, context) => {
    requireAuth(context);
    const { enabled, keyId, keySecret } = getRazorpayConfig();
    if (!enabled) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Online payment gateway is not configured."
      );
    }

    assertCampusLocation(data.latitude, data.longitude);
    await assertRateLimit(context.auth.uid);
    const { validatedItems, calculatedTotal } = await validateAndPriceItems(data.items || []);

    const amountPaise = Math.round(calculatedTotal * 100);
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const receipt = `rcpt_${context.auth.uid.slice(0, 8)}_${Date.now()}`.slice(0, 40);

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt,
        notes: { uid: context.auth.uid },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Razorpay order error:", errText);
      throw new functions.https.HttpsError("internal", "Could not create payment order.");
    }

    const rzOrder = await res.json();
    await db.collection("paymentIntents").doc(rzOrder.id).set({
      uid: context.auth.uid,
      amount: calculatedTotal,
      items: validatedItems,
      scheduled_for: data.scheduled_for || null,
      status: "created",
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      razorpayOrderId: rzOrder.id,
      amount: amountPaise,
      currency: "INR",
      keyId,
    };
  });

/**
 * Place order — prices from menu, never trusts client totals/status.
 * Payment: Razorpay signature (Verified) OR manual UTR (Unverified until staff confirms).
 */
exports.placeOrder = functions
  .runWith({ enforceAppCheck: true })
  .https.onCall(async (data, context) => {
    requireAuth(context);
    const uid = context.auth.uid;

    assertCampusLocation(data.latitude, data.longitude);
    await assertRateLimit(uid);

    const { enabled, keySecret } = getRazorpayConfig();
    let paymentStatus = "Unverified";
    let paymentMethod = "UPI";
    let utrNumber = "";
    let razorpayPaymentId = null;
    let itemsSource = data.items || [];

    // Fix 7 — validate scheduled_for: must be null, an allowed label, or HH:MM format
    const scheduledFor = data.scheduled_for || null;
    if (
      scheduledFor !== null &&
      !ALLOWED_SCHEDULED_VALUES.includes(scheduledFor) &&
      !/^\d{1,2}:\d{2}$/.test(scheduledFor)
    ) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid scheduled_for value.");
    }

    if (enabled && data.razorpay_order_id && data.razorpay_payment_id && data.razorpay_signature) {
      const ok = verifyRazorpaySignature(
        data.razorpay_order_id,
        data.razorpay_payment_id,
        data.razorpay_signature,
        keySecret
      );
      if (!ok) {
        throw new functions.https.HttpsError("permission-denied", "Invalid payment signature.");
      }

      const intentRef = db.collection("paymentIntents").doc(data.razorpay_order_id);
      const intentSnap = await intentRef.get();
      if (!intentSnap.exists || intentSnap.data().uid !== uid) {
        throw new functions.https.HttpsError("permission-denied", "Unknown payment intent.");
      }
      if (intentSnap.data().status === "captured") {
        throw new functions.https.HttpsError("already-exists", "Payment already used.");
      }

      itemsSource = intentSnap.data().items;
      paymentStatus = "Verified";
      paymentMethod = "Razorpay";
      razorpayPaymentId = data.razorpay_payment_id;
      await intentRef.set({ status: "captured", payment_id: razorpayPaymentId }, { merge: true });
    } else {
      // Manual UPI + UTR — staff must verify; never auto-mark Paid/Verified
      const utr = String(data.utr_number || "").replace(/\D/g, "");
      if (utr.length !== 12) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "A valid 12-digit UTR is required when gateway payment is not used."
        );
      }
      // Fix 5 — reject replay: same UTR cannot be submitted twice
      await reserveUTR(utr);
      utrNumber = utr;
      paymentStatus = "Unverified";
      paymentMethod = "UPI";
    }

    const { validatedItems, calculatedTotal, allExpress } = enabled && razorpayPaymentId
      ? {
          validatedItems: itemsSource,
          calculatedTotal: itemsSource.reduce((s, i) => s + i.price * i.quantity, 0),
          allExpress: itemsSource.every((i) => i.is_express),
        }
      : await validateAndPriceItems(itemsSource);

    // Even express items stay Pending until payment is verified (or staff advances).
    const status = paymentStatus === "Verified" && allExpress ? "READY" : "Pending";

    const tokenNumber = await allocateToken();
    const tokenStr = `#A-${tokenNumber}`;

    const newOrder = {
      uid,
      userEmail: context.auth.token.email || "",
      userName: context.auth.token.name || "",
      token_number: tokenStr,
      items: validatedItems,
      total_amount: calculatedTotal,
      status,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      utr_number: utrNumber,
      razorpay_payment_id: razorpayPaymentId,
      scheduled_for: scheduledFor,
    };

    const orderId = await writeOrderAndBoard(newOrder);
    return { orderId, token_number: tokenStr, payment_status: paymentStatus, total_amount: calculatedTotal };
  });

/**
 * Admin advances/cancels order and keeps the public display board in sync.
 */
exports.updateOrderStatus = functions
  .runWith({ enforceAppCheck: true })
  .https.onCall(async (data, context) => {
    requireAuth(context);
    const email = context.auth.token.email || "";
    const isClaimAdmin = context.auth.token.admin === true;
    const adminDoc = await db.collection("admins").doc(context.auth.uid).get();
    const bootstrap = ["canteen-staff@gmail.com", "varadmalpure@gmail.com"].includes(email);
    if (!isClaimAdmin && !adminDoc.exists && !bootstrap) {
      throw new functions.https.HttpsError("permission-denied", "Admin only.");
    }

    const orderId = data.orderId;
    const nextStatus = data.status;
    const allowed = ["Pending", "PREPARING", "READY", "COMPLETED", "CANCELLED"];
    if (!orderId || !allowed.includes(nextStatus)) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid status update.");
    }

    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Order not found.");
    }

    const updateData = { status: nextStatus };
    if (data.verifyPayment === true) {
      updateData.payment_status = "Verified";
    }

    const batch = db.batch();
    batch.update(orderRef, updateData);

    const boardRef = db.collection("displayBoard").doc(orderId);
    if (nextStatus === "COMPLETED" || nextStatus === "CANCELLED") {
      batch.delete(boardRef);
    } else {
      batch.set(
        boardRef,
        {
          token_number: orderSnap.data().token_number,
          status: nextStatus,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
    await batch.commit();
    return { ok: true };
  });

/**
 * Razorpay webhooks — marks payment intents; does not trust clients.
 * Configure webhook secret: firebase functions:config:set razorpay.webhook_secret="..."
 */
exports.razorpayWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  const { webhookSecret } = getRazorpayConfig();
  if (!webhookSecret) {
    res.status(503).send("Webhook not configured");
    return;
  }

  const signature = req.headers["x-razorpay-signature"];
  const rawBody = req.rawBody
    ? req.rawBody.toString("utf8")
    : JSON.stringify(req.body);
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  if (signature !== expected) {
    res.status(400).send("Invalid signature");
    return;
  }

  const event = req.body.event;
  const payment = req.body.payload?.payment?.entity;
  if (event === "payment.captured" && payment?.order_id) {
    await db.collection("paymentIntents").doc(payment.order_id).set(
      {
        webhook_status: "captured",
        webhook_payment_id: payment.id,
        webhook_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  res.json({ received: true });
});

/**
 * Staff: set student verificationStatus after reviewing ID + selfie in Storage.
 */
exports.setStudentVerification = functions
  .runWith({ enforceAppCheck: true })
  .https.onCall(async (data, context) => {
    requireAuth(context);
    const email = context.auth.token.email || "";
    const isClaimAdmin = context.auth.token.admin === true;
    const adminDoc = await db.collection("admins").doc(context.auth.uid).get();
    const bootstrap = ["canteen-staff@gmail.com", "varadmalpure@gmail.com"].includes(email);
    if (!isClaimAdmin && !adminDoc.exists && !bootstrap) {
      throw new functions.https.HttpsError("permission-denied", "Admin only.");
    }

    const { userId, verificationStatus } = data;
    if (!userId || !["pending", "verified", "rejected"].includes(verificationStatus)) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid verification update.");
    }

    await db.collection("users").doc(userId).set({ verificationStatus }, { merge: true });
    return { ok: true };
  });
