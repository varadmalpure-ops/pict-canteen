# PICT Canteen

A lightweight, real-time canteen ordering app built with React, Vite, TypeScript, Firebase Authentication, and Cloud Firestore.

## Project layout

```text
src/
  components/   Student menu, sign-in, checkout, kitchen, admin, and live board
  lib/           Firestore order writes, admin checks, food details, and pickup slots
  App.tsx        Auth hydration, routes, and shared active-order listener
  firebase.ts    Firebase client setup
  types.ts       Menu and order data types
firestore.rules  Authorization and data validation for client writes
firestore.indexes.json  Composite indexes for live and recent order queries
firebase.json    Spark-safe Hosting and Firestore deployment config
```

## Firebase setup

1. Enable **Email/Password** and **Google** sign-in in Firebase Authentication.
2. Create a Cloud Firestore database and register a Firebase web app.
3. Copy `.env.example` to `.env` and set the Firebase web app values. The web API key is a public client identifier; apply API restrictions and App Check in the Firebase Console.
4. Create the first staff grant in Firestore Console at `admins/{staff-auth-uid}` (for example, add `{ "role": "admin" }`). Further staff can be granted by an existing admin or through a custom `admin` claim.
5. Deploy the Hosting site and Firestore rules with `npm run deploy`.

The app uses Firebase Authentication, Firestore, and Firebase Hosting. It does not require Cloud Functions or Cloud Storage. Profile photo upload and online payment are not part of this Spark build. Checkout uses **Pay at the counter**; add online payment only with a trusted payment-verification backend.

The deploy script updates Hosting and Firestore rules/indexes only. It does not remove Cloud Functions or Storage resources that were already deployed to Firebase; review and remove those remote resources separately if they are no longer needed.

## Orders and security

- The client writes an order, its public token/status board entry, and the user's order cooldown marker in one Firestore batch.
- Firestore rules compare every submitted item against the live menu, check the total, bound quantities and line count, restrict pickup times to 15-minute slots, and enforce order ownership and the staff status flow.
- Full order records are visible to the owner and authorized staff. The public live board contains only a token and status.
- Orders use short tokens derived from Firestore's random document IDs; this avoids a counter service.
- Firebase App Check can be enabled with `VITE_RECAPTCHA_SITE_KEY` and enforced in the Firebase Console. Security rules remain the authorization boundary.

## Local development

```bash
npm install
npm run dev
```

Use an authorized staff account to manage menu items. Optional menu copy fields let staff add a catchy line and a recipe-based nutrition highlight; the student menu has cautious fallback copy for older menu records.

## Spark limits

The Firestore free tier includes 50,000 reads, 20,000 writes, and 20,000 deletes per day for one database; daily quotas reset around midnight Pacific time. Spark can disable a product after its plan quota is exceeded, so monitor reads and writes in the Firebase Console, especially live listeners for the menu, kitchen queue, and public board.
