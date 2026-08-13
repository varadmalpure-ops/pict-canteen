const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.placeOrder = functions.https.onCall(async (data, context) => {
  const items = data.items || [];
  if (!Array.isArray(items) || items.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "Order must contain items.");
  }

  let calculatedTotal = 0;
  const validatedItems = [];

  // Fetch menu items to verify prices and existence
  for (const item of items) {
    if (!item.itemId || !item.quantity) continue;
    
    const menuDoc = await db.collection("menuItems").doc(item.itemId).get();
    if (!menuDoc.exists) {
      throw new functions.https.HttpsError("not-found", `Item ${item.itemId} not found.`);
    }
    
    const menuData = menuDoc.data();
    if (!menuData.is_available) {
      throw new functions.https.HttpsError("failed-precondition", `Item ${menuData.name} is currently unavailable.`);
    }

    calculatedTotal += menuData.price * item.quantity;
    validatedItems.push({
      itemId: item.itemId,
      name: menuData.name,
      price: menuData.price,
      quantity: item.quantity
    });
  }

  if (validatedItems.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "No valid items in the order.");
  }

  // Generate token number securely using a transaction
  const counterRef = db.collection("metadata").doc("counter");
  const tokenNumber = await db.runTransaction(async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    let nextToken = 101;
    if (counterSnap.exists) {
      nextToken = counterSnap.data().current_token + 1;
    }
    transaction.set(counterRef, { current_token: nextToken }, { merge: true });
    return nextToken;
  });

  const tokenStr = `#A-${tokenNumber}`;

  // Create the order
  const newOrder = {
    token_number: tokenStr,
    items: validatedItems,
    total_amount: calculatedTotal,
    status: 'Pending',
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    payment_status: 'Paid',
    payment_method: data.paymentMethod || 'UPI'
  };

  const orderRef = await db.collection("orders").add(newOrder);

  return { orderId: orderRef.id, token_number: tokenStr };
});
