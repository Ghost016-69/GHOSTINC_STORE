# GHOSTINC_STORE

An online electronics and tech-accessories shop. It exists in two stacks side
by side: the original front end is plain HTML, CSS and JavaScript with no
build step over a Django + Django REST Framework API, and a newer
React + Vite + TypeScript + Tailwind app backed by Supabase that deploys to
GitHub Pages.

> **Before changing anything, read [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md).**
> It documents how the two data sources fit together, which rules are duplicated
> in more than one file, and the exact steps for common changes.

The shop sells phones, laptops, audio, gaming gear, wearables, displays, power
and accessories.

---

## Running it

### Option 1 - just the front end (no Python needed)

Open `Front-end/Templates/index.html` in a browser, or serve the folder:

```
python -m http.server 5500
```

then visit <http://127.0.0.1:5500/Front-end/Templates/>.

Everything works: browsing, search, filters, sorting, the product page and the
cart. Prices come from a snapshot saved in `Front-end/Scripts/data.js`, and a
notice at the top of the page says so.

### Option 2 - the full stack

In one terminal:

```
cd Back-end
python manage.py runserver
```

and serve the front end in another:

```
python -m http.server 5500
```

Now every page is answered by the live API, and the offline notice disappears.
Checkout, order lookup and the contact form only work in this mode, because
they write to the database.

### Option 3 - the React + Supabase app (in progress)

```powershell
npm ci
copy .env.example .env.local      # then fill in your Supabase URL and anon key
npm run dev                       # http://localhost:5173/
```

The same seven pages as routes (`/`, `/shop`, `/product/:slug`, `/cart`,
`/confirmation`, `/about`, `/contact`), sharing one cart and one catalogue.
Cart maths lives in `src/utils/pricing.ts` and totals are re-priced by the
`place_order()` SQL function before an order exists.

To publish: fill in `.env.local` for CI (as repository secrets
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`), apply the migrations in
`supabase/migrations/` to a Supabase project, and push — the workflow in
`.github/workflows/deploy.yml` builds and deploys `dist/` to GitHub Pages.

Without Supabase configuration the app still builds and runs; it shows a
configuration notice instead of pretending the catalogue is empty.

---

## How the hybrid data source works

`api.js` always tries the real API first. If the request fails **at the network
level** (status `0`, i.e. the server is not there) it transparently falls back
to the snapshot:

| File | Role |
| --- | --- |
| `Front-end/Scripts/api.js` | talks to Django, decides when to fall back |
| `Front-end/Scripts/data.js` | **generated** catalogue snapshot |
| `Front-end/Scripts/offline.js` | prices and filters from that snapshot |

A real HTTP status such as `400` or `404` is never retried locally, because
falling back there would hide genuine mistakes.

`offline.js` deliberately copies the back end's rules:

* `ProductListView` - search, filters, the six sort orders, 12-per-page paging
* `quote()` - subtotal, promo discount, delivery, 15% VAT, total
* `PromoCode` - the switch and the expiry date are both honoured

Money is handled in whole cents with integer arithmetic, so a float never
touches a total.

### Refreshing the snapshot

After changing products, prices or promo codes, rebuild it:

```
cd Back-end
python manage.py dump_store_data
```

That writes `Front-end/Scripts/data.js` through the same serializers the API
uses, so the two cannot drift apart.

---

## Tests

### Legacy stack

```
python Tests/_run_tests.py
```

Runs three stages and writes a report to `Tests/_last_run.log`:

1. **`_check_scripts.py`** - every `.js` file has balanced brackets and no
   string, comment or regex left open.
2. **`_verify_frontend.py`** - every page has balanced tags, a `data-page`
   attribute, and only asset references that exist on disk.
3. **Browser tests** - headless Edge loads the shop and checks 123 assertions,
   including every cart subtotal, discount, delivery, VAT and total against
   fixtures produced by Django's own `quote()`.

To regenerate those fixtures after a catalogue change:

```
cd Back-end
python ../Tests/_cart_fixtures.py > ../Tests/_fixtures.json
python ../Tests/_build_test.py
```

### React app

```powershell
npm run typecheck     # tsc --noEmit        -> 0 errors
npm test              # vitest              -> 34 passed (pricing + cart)
npm run build         # vite build          -> dist/
```

The pricing tests compare `calculateCartQuote()` against the same fixtures
Django's own `quote()` produced, so the two stacks cannot drift apart.

---

## Layout

```
Front-end/
  Templates/      index, shop, product, cart, confirmation, about, contact
  Style/          style.css (dark and light themes)
  Scripts/        data.js, offline.js, api.js, store.js, ui.js, main.js
  Images/         logo.png, favicon, product artwork
Back-end/
  config/         Django settings and URLs
  store/          models, serializers, views, pricing, urls
Tests/            the checks described above

src/              React app: pages/, components/, state/, lib/, utils/
public/images/    product artwork for the React app
supabase/         migrations: schema, RLS, seed data, place_order()
.github/workflows/ build and deploy dist/ to GitHub Pages
```

## Demo rules

This is a portfolio demo. No payments are taken. Prices are in rand (ZAR) and
include 15% VAT. Delivery is a flat R 99.00, free over R 2 500.00.
