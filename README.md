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
1. Create a Firebase project and enable **Auth**, **Firestore**, **Storage**, and **Functions**.
2. Copy `.env.example` to `.env` and fill in the web app config + App Check reCAPTCHA site key.
3. Deploy rules and functions:
```bash
firebase deploy --only firestore:rules,storage,functions
```
4. In Firebase Console → App Check: enforce App Check for **Firestore**, **Storage**, and **Cloud Functions**.
5. (Optional) Razorpay online payments:
```bash
firebase functions:config:set razorpay.key_id="rzp_..." razorpay.key_secret="..." razorpay.webhook_secret="..."
firebase deploy --only functions
```
Without Razorpay, students pay via UPI + UTR; staff must verify before advancing the order.

### 2. Run the Development Server
```bash
npm install
npm run dev
```
For local App Check, enable a debug token in the Firebase Console and uncomment `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` in `src/firebase.ts`.

### 3. Initialize Database
Call `initializeDatabase()` from `initDb.ts` while signed in as an admin (menu writes require admin). The token counter is created automatically by Cloud Functions on the first order.

## Security model
- Orders are created only via authenticated callable `placeOrder` (server prices from `menuItems`; Razorpay uses stored `paymentIntents` only).
- Clients cannot write `orders` or `metadata/counter`. Order reads are owner-or-admin only.
- Live TV reads `displayBoard` (token + status only). Kitchen `/kitchen` requires admin login and reads full tickets from `orders`.
- New accounts start as `verificationStatus: pending`. Registration expects `@pict.edu` / `@pict.edu.in`.
- Admin access: custom claim `admin`, `admins/{uid}`, or bootstrap emails in **rules/functions only** (not in the Vite client).
- App Check is required on callables (`enforceAppCheck: true`). Set `VITE_RECAPTCHA_SITE_KEY`.

## Features
- **Student View (`/`)**: Cart → server-validated order → token (e.g. `#A-104`).
- **Payments**: Razorpay (signature-verified) when configured; otherwise Pay at Counter with staff verification.
- **Admin View (`/admin`)**: Inventory, analytics, order management.
- **Kitchen (`/kitchen`)**: Auth-gated KDS with full ticket details.
- **Live TV (`/live`)**: Public token board without customer data.
