# Cauldron

Cauldron is a digital pantry app for keeping track of the ingredients in a user's kitchen. It helps users understand what they already have, what is close to expiring, and what they can cook before food goes to waste.

The app can scan grocery receipts or product barcodes to extract food items, then add them to the pantry with quantities and estimated expiry dates. It also includes an AI recipe chat powered by Gemini, so users can ask for meal ideas based on specific ingredients, nutrition goals, or pantry changes.

## What Cauldron Does

- Tracks pantry items, quantities, storage locations, and expiry timelines.
- Removes items automatically when their quantity reaches zero.
- Scans receipts and barcodes from the Extract tab.
- Confirms scanned barcode items before adding them to the pantry.
- Suggests recipes that can be made with existing pantry ingredients.
- Suggests a few stretch recipes that need only 1-2 extra ingredients.
- Lets users chat with AI to add, remove, update, or clear pantry items.
- Helps users identify ingredients to buy for nutrition or cooking goals.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase
- Gemini API

## Environment Variables

Create a `.env.local` file in the project root and add:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

The `.env.local` file is ignored by Git and should not be uploaded to GitHub.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Useful Commands

Run lint checks:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

Start the production build:

```bash
npm run start
```

## Mobile Testing

For camera and barcode testing on a phone, run the app locally and expose it with a secure tunnel such as ngrok:

```bash
ngrok http 3000
```

Open the generated HTTPS URL on your phone. Camera access generally requires HTTPS, so the ngrok URL is preferred for mobile barcode testing.
