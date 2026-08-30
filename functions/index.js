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

const callableOpts = { enforceAppCheck: true };

let menuCache = null;
let menuCacheTime = 0;

async function getCachedMenu() {
  const now = Date.now();
  if (menuCache && (now - menuCacheTime < 30_000)) {
    return menuCache;
  }
  const snap = await db.collection("menuItems").get();
  const map = new Map();
  snap.docs.forEach((doc) => map.set(doc.id, { id: doc.id, ...doc.data() }));
  menuCache = map;
  menuCacheTime = now;
  return map;
}

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

async function requireAdmin(context) {
  requireAuth(context);
  const isClaimAdmin = context.auth.token.admin === true;
  const adminDoc = await db.collection("admins").doc(context.auth.uid).get();
  if (!isClaimAdmin && !adminDoc.exists && !isBootstrapAdmin(context)) {
    throw new functions.https.HttpsError("permission-denied", "Admin only.");
  }
}

function getRazorpayConfig() {
  const rzp = functions.config().razorpay || {};
  const keyId = process.env.RAZORPAY_KEY_ID || rzp.key_id || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || rzp.key_secret || "";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || rzp.webhook_secret || "";
  return {
    enabled: Boolean(keyId && keySecret),
    keyId,
    keySecret,
    webhookSecret,
  };
}

function verifyRazorpaySignature(orderId, paymentId, signature, secret) {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(String(signature), "utf8"));
  } catch {
    return false;
  }
}

async function validateAndPriceItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "Order must contain items.");
  }
  if (items.length > MAX_ITEMS_PER_ORDER) {
    throw new functions.https.HttpsError("invalid-argument", "Too many line items.");
  }

  for (const item of items) {
    if (!item || typeof item.itemId !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "Each item needs a valid itemId.");
    }
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid item quantity.");
    }
  }

  const menuMap = await getCachedMenu();
  let calculatedTotal = 0;
  const validatedItems = [];
  let allExpress = true;

  for (const itemInput of items) {
    const quantity = Number(itemInput.quantity);
    let menuData = menuMap.get(itemInput.itemId);

    if (!menuData) {
      const freshSnap = await db.collection("menuItems").doc(itemInput.itemId).get();
      if (freshSnap.exists) {
        menuData = { id: freshSnap.id, ...freshSnap.data() };
        menuMap.set(itemInput.itemId, menuData);
      }
    }

    if (!menuData) {
      throw new functions.https.HttpsError("not-found", `Item ${itemInput.itemId} not found.`);
    }
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
    if (!Number.isFinite(price) || price < 0) {
      throw new functions.https.HttpsError("failed-precondition", "Invalid menu price.");
    }
    if (!menuData.is_express) allExpress = false;

    calculatedTotal += price * quantity;
    validatedItems.push({
      itemId: itemInput.itemId,
      name: menuData.name,
      price,
      quantity,
      is_express: Boolean(menuData.is_express),
    });
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
  return true;
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
  if (snap.data().verificationStatus === "rejected") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Your student account has been suspended."
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

function isBootstrapAdmin(context) {
  const email = context.auth?.token?.email || "";
  const verified = context.auth?.token?.email_verified === true;
  return verified && ["canteen-staff@gmail.com", "varadmalpure@gmail.com"].includes(email);
}

function isValidScheduledTime(timeStr) {
  if (timeStr === null || timeStr === undefined || timeStr === "") return true;
  if (typeof timeStr !== "string") return false;
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
  if (!match) return false;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3] ? match[3].toUpperCase() : null;
  if (minutes < 0 || minutes > 59) return false;
  if (meridiem) {
    if (hours < 1 || hours > 12) return false;
    if (meridiem === "PM" && hours < 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
  } else if (hours < 0 || hours > 23) {
    return false;
  }
  const totalMins = hours * 60 + minutes;
  return totalMins >= 540 && totalMins <= 1080;
}

async function allocateToken() {
  const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const counterRef = db.collection("metadata").doc(`counter_${dateStr}`);
  return db.runTransaction(async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    let nextToken = 1;
    if (counterSnap.exists) {
      nextToken = Number(counterSnap.data().current_token || 0) + 1;
    }
    transaction.set(counterRef, { current_token: nextToken, date: dateStr }, { merge: true });
    return nextToken;
  });
}

/** Public board: token + status only (no items / PII / payment fields). */
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

exports.getPaymentConfig = functions.runWith(callableOpts).https.onCall(async (_data, context) => {
  requireAuth(context);
  const { keyId, enabled } = getRazorpayConfig();
  return {
    provider: enabled ? "razorpay" : "pay_at_counter",
    razorpayKeyId: enabled ? keyId : null,
  };
});

exports.createPaymentOrder = functions.runWith(callableOpts).https.onCall(async (data, context) => {
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

  const scheduledFor = data.scheduled_for || null;
  if (scheduledFor !== null && !isValidScheduledTime(scheduledFor)) {
    throw new functions.https.HttpsError("invalid-argument", "Pickup time must be between 9:00 AM and 6:00 PM.");
  }

  const { validatedItems, calculatedTotal } = await validateAndPriceItems(data.items || []);
  if (calculatedTotal <= 0) {
    throw new functions.https.HttpsError("invalid-argument", "Order total must be positive for online payment.");
  }

  const amountPaise = Math.round(calculatedTotal * 100);
  const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const receipt = `rcpt_${context.auth.uid.slice(0, 8)}_${Date.now()}`.slice(0, 40);

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
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
    scheduled_for: scheduledFor,
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

exports.placeOrder = functions.runWith(callableOpts).https.onCall(async (data, context) => {
  requireAuth(context);
  const uid = context.auth.uid;

  assertCampusLocation(data.latitude, data.longitude);
  await assertRateLimit(uid);

  let scheduledFor = data.scheduled_for || null;
  if (scheduledFor !== null && !isValidScheduledTime(scheduledFor)) {
    throw new functions.https.HttpsError("invalid-argument", "Pickup time must be between 9:00 AM and 6:00 PM.");
  }

  const { enabled, keySecret } = getRazorpayConfig();
  let paymentStatus = "Pay at Counter";
  let paymentMethod = "Pay at Counter";
  let utrNumber = "COUNTER_PAY";
  let razorpayPaymentId = null;
  let intentRef = null;
  let validatedItems;
  let calculatedTotal;
  let allExpress;

  const usingRazorpay =
    enabled && data.razorpay_order_id && data.razorpay_payment_id && data.razorpay_signature;

  if (usingRazorpay) {
    const ok = verifyRazorpaySignature(
      data.razorpay_order_id,
      data.razorpay_payment_id,
      data.razorpay_signature,
      keySecret
    );
    if (!ok) {
      throw new functions.https.HttpsError("permission-denied", "Invalid payment signature.");
    }

    intentRef = db.collection("paymentIntents").doc(data.razorpay_order_id);
    const intentSnap = await intentRef.get();
    if (!intentSnap.exists || intentSnap.data().uid !== uid) {
      throw new functions.https.HttpsError("permission-denied", "Unknown payment intent.");
    }
    if (intentSnap.data().status === "captured") {
      throw new functions.https.HttpsError("already-exists", "Payment already used.");
    }

    const intent = intentSnap.data();
    // Never trust client basket — use server-stored intent only
    validatedItems = intent.items;
    calculatedTotal = Number(intent.amount);
    allExpress = Array.isArray(validatedItems) && validatedItems.every((i) => i.is_express);
    scheduledFor = intent.scheduled_for || scheduledFor;
    paymentStatus = "Verified";
    paymentMethod = "Razorpay";
    razorpayPaymentId = data.razorpay_payment_id;
  } else {
    const priced = await validateAndPriceItems(data.items || []);
    validatedItems = priced.validatedItems;
    calculatedTotal = priced.calculatedTotal;
    allExpress = priced.allExpress;

    // Only zero-priced server totals are auto-verified (no client FREE_SAMPLE flag)
    if (calculatedTotal === 0) {
      paymentStatus = "Verified";
      paymentMethod = "Sample Test (₹0)";
      utrNumber = "SAMPLE_TEST_0";
    } else {
      paymentStatus = "Pay at Counter";
      paymentMethod = "Pay at Counter";
      utrNumber = "COUNTER_PAY";
    }
  }

  if (!Array.isArray(validatedItems) || validatedItems.length === 0 || !Number.isFinite(calculatedTotal)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid priced order.");
  }

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
    geo_verified: true,
  };

  const orderId = await writeOrderAndBoard(newOrder);

  // Mark intent captured only after the order exists
  if (intentRef && razorpayPaymentId) {
    await intentRef.set(
      { status: "captured", payment_id: razorpayPaymentId, order_id: orderId },
      { merge: true }
    );
  }

  return { orderId, token_number: tokenStr, payment_status: paymentStatus, total_amount: calculatedTotal };
});

exports.updateOrderStatus = functions.runWith(callableOpts).https.onCall(async (data, context) => {
  await requireAdmin(context);

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
  const rawBody = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(req.body);
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  try {
    if (!signature || !crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(String(signature), "utf8"))) {
      res.status(400).send("Invalid signature");
      return;
    }
  } catch {
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

exports.setStudentVerification = functions.runWith(callableOpts).https.onCall(async (data, context) => {
  await requireAdmin(context);

  const { userId, verificationStatus } = data;
  if (!userId || !["pending", "verified", "rejected"].includes(verificationStatus)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid verification update.");
  }

  await db.collection("users").doc(userId).set({ verificationStatus }, { merge: true });
  return { ok: true };
});

/** Lightweight admin probe for clients (no emails in the Vite bundle). */
exports.assertAdmin = functions.runWith(callableOpts).https.onCall(async (_data, context) => {
  await requireAdmin(context);
  // Ensure admins/{uid} exists for rules-based Storage/Firestore checks
  await db.collection("admins").doc(context.auth.uid).set(
    {
      email: context.auth.token.email || "",
      role: "admin",
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return { ok: true, uid: context.auth.uid };
});
