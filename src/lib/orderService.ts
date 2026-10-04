import { doc, serverTimestamp, writeBatch, runTransaction } from 'firebase/firestore';
import { db, displayBoardCollection, ordersCollection } from '../firebase';
import type { Order, OrderItem, OrderStatus } from '../types';

function getTodayDateKey(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

export async function createStudentOrder(input: {
  uid: string;
  items: OrderItem[];
  scheduledFor: string | null;
}) {
  const items = input.items.map((item) => ({
    itemId: item.itemId,
    name: item.name,
    price: Number(item.price),
    quantity: Number(item.quantity),
    is_express: Boolean(item.is_express),
  }));

  if (items.length < 1 || items.length > 6) {
    throw new Error('An order can contain up to six different dishes.');
  }
  if (items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20 || !Number.isFinite(item.price) || item.price <= 0)) {
    throw new Error('Your cart has an invalid quantity or price. Please review it and try again.');
  }

  const totalAmount = items.reduce((total, item) => total + item.price * item.quantity, 0);
  const orderRef = doc(ordersCollection);
  const todayKey = getTodayDateKey();
  const counterRef = doc(db, 'counters', todayKey);
  const status: OrderStatus = 'Pending';

  let assignedToken = '1';
  let committedOrder: Order | null = null;

  // Atomically increment the daily token counter starting from 1 each day
  const committed = runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    let nextNum = 1;
    if (counterSnap.exists()) {
      const data = counterSnap.data();
      nextNum = (Number(data.count) || 0) + 1;
    }
    assignedToken = String(nextNum);

    const orderData = {
      uid: input.uid,
      token_number: assignedToken,
      items,
      total_amount: totalAmount,
      status,
      created_at: serverTimestamp(),
      payment_status: 'Pay at Counter' as const,
      payment_method: 'Pay at Counter',
      scheduled_for: input.scheduledFor,
    };

    transaction.set(counterRef, {
      count: nextNum,
      date: todayKey,
      updated_at: serverTimestamp()
    }, { merge: true });

    transaction.set(orderRef, orderData);

    transaction.set(doc(displayBoardCollection, orderRef.id), {
      token_number: assignedToken,
      status,
      updated_at: serverTimestamp(),
    }, { merge: true });

    transaction.set(doc(db, 'users', input.uid), {
      lastOrderAt: serverTimestamp(),
      lastOrderId: orderRef.id,
    }, { merge: true });

    committedOrder = {
      id: orderRef.id,
      ...orderData,
      created_at: Date.now()
    } as unknown as Order;
  });

  // Fast optimistic representation for instant UI response
  const localOrder: Order = {
    id: orderRef.id,
    uid: input.uid,
    token_number: assignedToken,
    items,
    total_amount: totalAmount,
    status,
    created_at: Date.now(),
    payment_status: 'Pay at Counter',
    payment_method: 'Pay at Counter',
    scheduled_for: input.scheduledFor,
  };

  return {
    order: localOrder,
    committed: committed.then(() => committedOrder || localOrder)
  };
}

export async function updateOrderStatus(order: Order, status: OrderStatus) {
  const batch = writeBatch(db);
  const orderRef = doc(ordersCollection, order.id);
  const boardRef = doc(displayBoardCollection, order.id);
  batch.update(orderRef, { status });

  if (status === 'COMPLETED' || status === 'CANCELLED') {
    batch.delete(boardRef);
  } else {
    batch.set(boardRef, {
      token_number: order.token_number,
      status,
      updated_at: serverTimestamp(),
    }, { merge: true });
  }

  await batch.commit();
}
