import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, displayBoardCollection, ordersCollection } from '../firebase';
import type { Order, OrderItem, OrderStatus } from '../types';

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
  const tokenNumber = `A-${orderRef.id.substring(0, 6)}`;
  const status: OrderStatus = 'Pending';
  const order = {
    uid: input.uid,
    token_number: tokenNumber,
    items,
    total_amount: totalAmount,
    status,
    created_at: serverTimestamp(),
    payment_status: 'Pay at Counter' as const,
    payment_method: 'Pay at Counter',
    scheduled_for: input.scheduledFor,
  };

  const batch = writeBatch(db);
  batch.set(orderRef, order);
  batch.set(doc(displayBoardCollection, orderRef.id), {
    token_number: tokenNumber,
    status,
    updated_at: serverTimestamp(),
  });
  batch.update(doc(db, 'users', input.uid), {
    lastOrderAt: serverTimestamp(),
    lastOrderId: orderRef.id,
  });

  // Firestore applies the batch to its local cache immediately. Return the
  // pending order now so checkout can close without waiting on a round trip;
  // callers still handle a rules/server rejection through this promise.
  const committed = batch.commit();
  const localOrder = { id: orderRef.id, ...order, created_at: Date.now() } as unknown as Order;
  return { order: localOrder, committed };
}

export async function updateOrderStatus(order: Order, status: OrderStatus) {
  const batch = writeBatch(db);
  const orderRef = doc(ordersCollection, order.id);
  const boardRef = doc(displayBoardCollection, order.id);
  batch.update(orderRef, { status });

  if (status === 'COMPLETED' || status === 'CANCELLED') {
    batch.delete(boardRef);
  } else {
    batch.update(boardRef, {
      token_number: order.token_number,
      status,
      updated_at: serverTimestamp(),
    });
  }

  await batch.commit();
}
