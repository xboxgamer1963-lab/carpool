# Carpool

A carpool marketplace where car owners post their commute (car, route, timings)
and riders search by home + drop-off location, then contact drivers directly via
phone or WhatsApp.

**Stack:** Astro (SSR) · Clerk (auth) · Firestore via Firebase Admin SDK ·
Leaflet + OpenStreetMap (interactive maps, no API key) · deployed on Vercel.

## Interactive map

- **Browse page** shows every pinned ride as a car marker. Click a car (or its
  card) to open details and watch the car **drive its route** to the drop-off.
- **Registration** uses a draggable pickup/drop-off picker with address search
  (Nominatim geocoding); it stores coordinates and auto-fills the area names.
- Maps use Leaflet with CARTO/OSM tiles — no key required. To switch to Google
  Maps or Mapbox later, replace the tile layer + picker in `src/components/`.
- Listings created before the map feature have no coordinates and simply won't
  appear as pins (a small "not pinned yet" note is shown).

## Setup

1. **Install**
   ```bash
   npm install
   ```

2. **Add your keys** — copy the example and fill it in:
   ```bash
   cp .env.example .env
   ```
   - **Clerk** → Dashboard → API Keys: `PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
   - **Firebase** → Project Settings → Service accounts → *Generate new private key*.
     Copy `project_id`, `client_email`, `private_key` from the JSON into
     `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
     (keep the `\n` sequences inside the quoted private key).

3. **Run**
   ```bash
   npm run dev
   ```
   Open http://localhost:4321

## How it works

- **Drivers** sign in, then `/drivers/register` to publish a ride.
- **Riders** browse `/drivers` and search by `from` / `to` area.
- Contact is direct: each card has a WhatsApp deep-link (prefilled message) and a
  call button.

## Routes

| Path                  | Purpose                                  | Auth      |
| --------------------- | ---------------------------------------- | --------- |
| `/`                   | Landing + search                         | Public    |
| `/drivers`            | Browse / search rides                    | Public    |
| `/drivers/register`   | Publish a ride                           | Required  |
| `/drivers/mine`       | Manage your listings (delete)            | Required  |
| `/api/drivers/create` | Create a listing (form POST)             | Required  |
| `/api/drivers/delete` | Delete your own listing (form POST)      | Required  |

## Data model — Firestore `drivers` collection

`ownerId, name, phone, carMake, carModel, carColor, seats, fromLocation,
toLocation, stops[], departTime, returnTime, days[], fare, notes, createdAt`
(plus lowercased `fromLocation_lc` / `toLocation_lc` for matching).

All reads/writes go through the Admin SDK on the server, so Firestore security
rules can stay locked down (no client SDK access). Search is a substring filter
in `src/lib/drivers.ts` — fine for small scale; swap for Algolia/Typesense or
geo-queries if listings grow large.

## Deploy to Netlify

1. Push to a Git repo and import it in Netlify. The `@astrojs/netlify` adapter
   and `netlify.toml` (build command, publish dir, Node 20) are already set up,
   so no manual build config is needed.
2. Add the same `.env` variables in **Netlify → Site configuration →
   Environment variables** (Clerk + Firebase). Without them, pages return 500.
3. Set Clerk's allowed origins / production keys for your Netlify domain.
