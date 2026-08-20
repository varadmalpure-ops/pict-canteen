# PICT Canteen Ordering System

A lightweight, real-time web application to streamline order management and eliminate counter crowding at the PICT Canteen.

## Technology Stack
- **Frontend**: React (Vite) + TypeScript
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Database/Backend**: Firebase Firestore (Real-time syncing)

## Folder Structure
```text
.
├── src/
│   ├── components/
│   │   ├── StudentView.tsx    # Customer-facing menu, cart, and live tracker
│   │   └── AdminView.tsx      # Canteen staff kitchen display and inventory toggle
│   ├── App.tsx                # Application routing layout
│   ├── firebase.ts            # Firebase configuration
│   ├── initDb.ts              # Script to populate mock menu data
│   ├── types.ts               # TypeScript interfaces for database schema
│   ├── main.tsx               # React entry point
│   └── index.css              # Tailwind CSS v4 styling
├── vite.config.ts             # Vite configuration with Tailwind plugin
└── package.json               # Dependencies
```

## Setup Instructions

### 1. Firebase Configuration
You need to set up a Firebase project with a Firestore database:
1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a project.
2. Enable **Firestore Database** in test mode (or configure security rules).
3. Get your Web App config and paste it into `src/firebase.ts`.

### 2. Run the Development Server
Install dependencies and start the app:
```bash
npm install
npm run dev
```

### 3. Initialize Database
To populate the database with the initial menu items, you can temporarily call `initializeDatabase()` from `initDb.ts` inside a `useEffect` in `App.tsx`, or run it manually.

## Features
- **Student View (`/`)**: Add items to cart (under 3 clicks), place order, and receive a Token Number (e.g. #A-104). The app enforces crowd control with live status tracking ("Preventing Counter Crowding").
- **Bill Splitting**: Students can split the bill in a group using equal split or custom split amounts, and seamlessly coordinate payments.
- **Secure Payments**: UTR number tracking for UPI payments.
- **Admin View (`/admin`)**: High-contrast Kitchen Display for active orders. One-tap toggles to advance order state (`RECEIVED` $\rightarrow$ `PREPARING` $\rightarrow$ `READY` $\rightarrow$ `COMPLETED`). Quick toggle switches for Inventory Control.
- **Security**: Firebase AppCheck with ReCaptcha V3 integrated to prevent bot abuse.
