import { menuItemsCollection } from './firebase';
import { addDoc, getDocs, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { MenuItem } from './types';

// Mock data reflecting a realistic engineering college canteen menu in Pune
const mockMenuItems: Omit<MenuItem, 'id'>[] = [
  // Beverages & Breakfast
  { name: 'Tea', price: 10, category: 'Beverages & Breakfast', is_available: true, is_express: true },
  { name: 'Coffee', price: 20, category: 'Beverages & Breakfast', is_available: true, is_express: true },
  { name: 'Milk', price: 23, category: 'Beverages & Breakfast', is_available: true, is_express: true },
  { name: 'Haldi Milk', price: 23, category: 'Beverages & Breakfast', is_available: true, is_express: true },
  { name: 'Bournvita', price: 30, category: 'Beverages & Breakfast', is_available: true, is_express: true },
  { name: 'Black Tea', price: 13, category: 'Beverages & Breakfast', is_available: true, is_express: true },
  { name: 'Butter Milk', price: 20, category: 'Beverages & Breakfast', is_available: true, is_express: true },
  { name: 'Lemon Juice', price: 20, category: 'Beverages & Breakfast', is_available: true, is_express: true },
  { name: 'Black Coffee', price: 20, category: 'Beverages & Breakfast', is_available: true, is_express: true },
  { name: 'Upma', price: 25, category: 'Beverages & Breakfast', is_available: true },
  { name: 'Kanda Poha', price: 25, category: 'Beverages & Breakfast', is_available: true },

  // Snacks & South Indian
  { name: 'Idli Sambar / Chutney', price: 35, category: 'Snacks & South Indian', is_available: true },
  { name: 'Single Idli Sambar', price: 20, category: 'Snacks & South Indian', is_available: true },
  { name: 'Single Wada Sambar', price: 25, category: 'Snacks & South Indian', is_available: true },
  { name: 'Medu Wada Sambar Chutney', price: 40, category: 'Snacks & South Indian', is_available: true },
  { name: 'Misal Pav', price: 45, category: 'Snacks & South Indian', is_available: true },
  { name: 'Wada Pav', price: 20, category: 'Snacks & South Indian', is_available: true },
  { name: 'Bread Pattice', price: 20, category: 'Snacks & South Indian', is_available: true },
  { name: 'Onion Pakoda (6 Pcs)', price: 30, category: 'Snacks & South Indian', is_available: true },
  { name: 'Samosa (1 Pc)', price: 20, category: 'Snacks & South Indian', is_available: true },
  { name: 'Chilly Pakoda (6 Pcs)', price: 30, category: 'Snacks & South Indian', is_available: true },
  { name: 'Plain Dosa', price: 30, category: 'Snacks & South Indian', is_available: true },
  { name: 'Plain Cheese Dosa', price: 45, category: 'Snacks & South Indian', is_available: true },

  // Dosa, Uttapa & Maggie
  { name: 'Masala Dosa', price: 40, category: 'Dosa, Uttapa & Maggie', is_available: true },
  { name: 'Uttapa Plain', price: 30, category: 'Dosa, Uttapa & Maggie', is_available: true },
  { name: 'Cheese Dosa', price: 45, category: 'Dosa, Uttapa & Maggie', is_available: true },
  { name: 'Cheese Masala Dosa', price: 50, category: 'Dosa, Uttapa & Maggie', is_available: true },
  { name: 'Tomato/onion/mix Uttapa', price: 40, category: 'Dosa, Uttapa & Maggie', is_available: true },
  { name: 'Cheese Uttappa', price: 45, category: 'Dosa, Uttapa & Maggie', is_available: true },
  { name: 'Cheese Onion Uttappa', price: 50, category: 'Dosa, Uttapa & Maggie', is_available: true },
  { name: 'Maggie', price: 30, category: 'Dosa, Uttapa & Maggie', is_available: true },
  { name: 'Veg Maggie', price: 36, category: 'Dosa, Uttapa & Maggie', is_available: true },
  { name: 'Cheese Maggie', price: 40, category: 'Dosa, Uttapa & Maggie', is_available: true },
  { name: 'Veg Cheese Maggie', price: 50, category: 'Dosa, Uttapa & Maggie', is_available: true },

  // Sandwiches & Quick Bites
  { name: 'Chutney Sandwich', price: 30, category: 'Sandwiches & Quick Bites', is_available: true },
  { name: 'Veg Sandwich', price: 40, category: 'Sandwiches & Quick Bites', is_available: true },
  { name: 'Veg Grilled Sandwich', price: 42, category: 'Sandwiches & Quick Bites', is_available: true },
  { name: 'Veg Cheese Grilled Sandwich', price: 55, category: 'Sandwiches & Quick Bites', is_available: true },
  { name: 'Veg Cheese Sandwich', price: 50, category: 'Sandwiches & Quick Bites', is_available: true },
  { name: 'Paneer Sandwich', price: 50, category: 'Sandwiches & Quick Bites', is_available: true },
  { name: 'Paneer Cheese Sandwich', price: 70, category: 'Sandwiches & Quick Bites', is_available: true },
  { name: 'Bread Butter', price: 30, category: 'Sandwiches & Quick Bites', is_available: true },
  { name: 'Bread Butter Toast', price: 35, category: 'Sandwiches & Quick Bites', is_available: true },
  { name: 'Aloo Paratha With Curd', price: 50, category: 'Sandwiches & Quick Bites', is_available: true },
  { name: 'Sabudana Khichadi', price: 45, category: 'Sandwiches & Quick Bites', is_available: true },

  // Meals & Thali
  { name: 'Dal Khichadi', price: 45, category: 'Meals & Thali', is_available: true },
  { name: 'Chapati Bhaji', price: 45, category: 'Meals & Thali', is_available: true },
  { name: 'Paneer Bhaji + Chapati', price: 55, category: 'Meals & Thali', is_available: true },
  { name: 'Tawa Pulav', price: 65, category: 'Meals & Thali', is_available: true },
  { name: 'Veg Thali (Unlimited)', price: 80, category: 'Meals & Thali', is_available: true },
  { name: 'Sunday Thali', price: 130, category: 'Meals & Thali', is_available: true },
  { name: 'Single Chapati', price: 10, category: 'Meals & Thali', is_available: true },
  { name: 'Only Sabji/dal', price: 25, category: 'Meals & Thali', is_available: true },
  { name: 'Sp. Lachha Paratha With Sabji', price: 65, category: 'Meals & Thali', is_available: true },
];

let isInitializing = false;

export async function initializeDatabase() {
  if (isInitializing) return;
  isInitializing = true;

  console.log('Initializing database...');
  try {
    const snapshot = await getDocs(menuItemsCollection);
    if (!snapshot.empty) {
      console.log('Clearing old menu items...');
      const deletePromises = snapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);
    }

    // 2. Add new mock data using Firebase v9 modular SDK
    const addPromises = mockMenuItems.map(item => 
      addDoc(menuItemsCollection, item)
    );
    await Promise.all(addPromises);
    
    // Initialize token counter
    const counterRef = doc(db, 'metadata', 'counter');
    const counterSnap = await getDoc(counterRef);
    if (!counterSnap.exists()) {
      await setDoc(counterRef, { current_token: 100 });
    }
    
    console.log('Database initialized successfully with mock menu items!');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    isInitializing = false;
  }
}
