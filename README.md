# Cauldron

Cauldron is a mobile-first digital pantry that helps people track food, use ingredients before they expire, and decide what to cook. Pantry data is synced to each user's private Supabase account, with a local browser copy available if cloud sync is temporarily unavailable.

## Features

- Private email/password accounts with session refresh and email confirmation.
- Pantry tracking for quantities, units, categories, storage locations, and estimated expiry.
- Automatic removal of an item when its quantity reaches zero.
- Receipt photo scanning with Gemini to extract grocery items in one step.
- Live camera barcode scanning with a photo fallback for unsupported browsers.
- Open Food Facts lookups for product names, brands, package sizes, images, nutrition, and Nutri-Score data.
- A confirmation screen before barcode results are added to the pantry.
- Pantry-aware AI chat that can add, update, remove, or clear items.
- Recipe suggestions split between meals available now and stretch ideas that need only one or two extra ingredients.
- Nutrition notes, shopping suggestions, recipe match scores, and step-by-step cooking views.

## Tech Stack

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4
- Supabase Auth, Postgres, and Row Level Security
- Google Gemini API
- Open Food Facts API

## Prerequisites

- Node.js 20.9 or newer
- npm
- A Supabase project
- A Google Gemini API key

## Local Setup

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/aniqanzr/Cauldron.v2.git
   cd Cauldron.v2
   npm install
   ```

2. Create `.env.local` in the project root:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key

   # Optional; defaults to gemini-2.5-flash
   GEMINI_MODEL=gemini-2.5-flash
   ```

3. In the Supabase SQL editor, run [`supabase/schema.sql`](supabase/schema.sql).

4. In Supabase Auth:

   - Enable email/password sign-ups.
   - Add your local and deployed app URLs to the allowed redirect URLs if email confirmation is enabled.

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

The app queries Open Food Facts directly for barcode metadata, so no additional API key is required for product lookup.

## Supabase Notes

The `pantry_items` table stores each row with a `user_id`. The included Row Level Security policies ensure authenticated users can only read and change their own pantry.

If the app reports that the cloud pantry table is missing, run [`supabase/schema.sql`](supabase/schema.sql). If a manually created table has incompatible columns, run [`supabase/reset-pantry-items.sql`](supabase/reset-pantry-items.sql) to recreate it with the expected schema and policies.

> [!WARNING]
> `supabase/reset-pantry-items.sql` drops the existing `pantry_items` table and deletes its rows.

The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is intended for browser use. Keep Row Level Security enabled, and never place a Supabase service-role key in a `NEXT_PUBLIC_` variable.

## Useful Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run lint` | Run ESLint |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build |

## Mobile Camera Testing

Camera access normally requires HTTPS outside `localhost`. To test receipt and barcode scanning on a phone, expose the local server through a secure tunnel:

```bash
ngrok http 3000
```

Open the generated HTTPS URL on the phone and allow camera access. The development configuration accepts common ngrok domains.

## Project Structure

```text
src/app/
├── api/
│   ├── auth/          # Supabase authentication proxy
│   ├── barcode-scan/  # Barcode detection and product enrichment
│   ├── pantry/        # Authenticated pantry persistence
│   ├── receipt-scan/  # Gemini receipt extraction
│   └── recipe-chat/   # Gemini pantry actions and recipe suggestions
├── page.tsx           # Main mobile-first application
└── globals.css
lib/
├── supabaseClient.ts
└── supabaseServer.ts
supabase/
├── schema.sql
└── reset-pantry-items.sql
```

## Data and API Behavior

- Browser requests go through server-side route handlers for Supabase and Gemini operations.
- Pantry changes are saved locally per user and synced to Supabase after a short debounce.
- Directly detected barcodes are enriched through Open Food Facts.
- When native browser barcode detection is unavailable, Cauldron sends a camera frame to Gemini as a fallback.
- Receipt and image uploads are processed for extraction and are not committed to this repository.

Environment files are ignored by Git and must not be committed.
