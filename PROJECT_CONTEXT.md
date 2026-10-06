# GHOSTINC_STORE — Project Context

**Read this before changing anything in this project.** It records how the
system fits together, which rules are duplicated in more than one place, and
what will silently break if you change one side of a pair and not the other.

Last verified: 2026-10-05, with both servers running locally.

---

## 1. What this is

An online store selling electronics and tech accessories (phones, laptops,
audio, gaming, wearables, displays, power, accessories).

- **Front end** — plain HTML, CSS and JavaScript. No frameworks, no bundler,
  no `package.json`, no Node in the toolchain.
- **Back end** — Django 6 + Django REST Framework, SQLite.

It is a **portfolio demo**: no payments are taken. Prices are South African rand
and include VAT.

The distinguishing feature is that **the front end works with or without the
back end running**. See section 4 — this is the single most important thing to
understand about the codebase.

---

## 2. Quick start

**Front end only** (no Python, no server) — open
`Front-end/Templates/index.html` directly in a browser.

**Full stack** — two terminals:

```powershell
cd Back-end
python manage.py runserver            # API on :8000

# second terminal, from the project root
python -m http.server 5500 --directory Front-end
```

Then open <http://127.0.0.1:5500/Templates/>.

Useful URLs: `/api/` browsable API · `/admin/` Django admin ·
<http://127.0.0.1:5500/Templates/shop.html> the shop.

**Reset the demo data** (idempotent — safe to re-run):

```powershell
cd Back-end
python manage.py seed_products        # 8 categories, 14 brands, 30 products, 3 promos
python manage.py dump_store_data      # refresh the offline snapshot
```

---

## 3. Layout

```
Front-end/
  Templates/     index, shop, product, cart, confirmation, about, contact
  Style/         style.css  (dark + light themes, ~37 KB)
  Scripts/       data.js  offline.js  api.js  store.js  ui.js  main.js
  Images/        logo.png, favicon.svg, products/*.svg
Back-end/
  config/        settings.py, urls.py
  store/         models.py, serializers.py, views.py, pricing.py, urls.py,
                 admin.py, tests.py
                 management/commands/  seed_products.py, dump_store_data.py
Tests/           _run_tests.py + browser tests
```

Script load order in every page matters and is fixed:

```
data.js  →  offline.js  →  api.js  →  store.js  →  ui.js  →  main.js
```

`data.js` defines `window.GHOSTINC_DATA`, `offline.js` turns it into
`window.GHOSTINC.offline`, and `api.js` reads both. All are `defer`, so order
equals execution order.

| Script | Role | Edit by hand? |
| --- | --- | --- |
| `data.js` | generated catalogue snapshot | **No — regenerate** |
| `offline.js` | prices/filters from the snapshot | Yes |
| `api.js` | talks to Django, decides when to fall back | Yes |
| `store.js` | cart + wishlist in `localStorage` | Yes |
| `ui.js` | renders cards, drawer, toasts | Yes |
| `main.js` | per-page controllers | Yes |

---

## 4. The dual data source (read this first)

`api.js` wraps every call in a `hybrid()` helper:

1. Try the **live Django API**.
2. If — and only if — the request fails **at the network level**, fall back to
   `offline.js`, which answers from the `data.js` snapshot.

A **network failure** is `error.status === 0`. A real HTTP response such as
`400` or `404` is **never** retried locally. That distinction is deliberate:
falling back on a 404 would hide genuine mistakes behind plausible-looking demo
data.

Once a fallback happens, `offlineMode` latches to `true` for the session and
the dead socket is skipped from then on. `api.onOffline(cb)` fires once, and
`main.js` uses it to show the amber "Showing saved prices" banner.

### What works offline vs. what needs Django

| Feature | Offline | Needs Django |
| --- | --- | --- |
| Browse, search, filter, sort, paginate | yes | yes |
| Product detail page + specs + related | yes | yes |
| Add to cart, change quantities, wishlist | yes | yes |
| Cart totals, promo codes | yes | yes |
| **Checkout** | **no — refuses with a message** | yes |
| **Order lookup** | **no** | yes |
| **Contact form** | **no** | yes |

The three write endpoints deliberately reject rather than fake success, so a
demo is never mistaken for a real transaction.

### Keeping the snapshot in step

`data.js` is produced by `python manage.py dump_store_data`, which serialises
through **the same serializers the API uses**. The two therefore cannot drift
in field names or money formatting.

**If you change product data — price, stock, a new product, a new field — you
must re-run `dump_store_data`**, or the offline shop will keep serving the old
catalogue while the live shop serves the new one.

`dump_store_data` deliberately omits the `related` field; `offline.js` derives
the four sibling cards itself.

---

## 5. Money

Money crosses the wire as a **string**, never a float
(`"2499.00"`), because a float cannot be trusted with cents.
`pricing.py::as_json()` and `offline.js::toMoney()` both enforce this.

The formula, identical in `store/pricing.py::quote()` and
`Front-end/Scripts/offline.js::priceCart()`:

```
subtotal    = Σ (unit price × quantity)
discount    = round_half_up(subtotal × percent_off ÷ 100)     if a promo applies
discounted  = subtotal − discount
shipping    = 0.00                       if the cart is empty
              0.00                       if discounted ≥ 2500.00
              99.00                      otherwise
taxable     = discounted + shipping
vat         = round_half_up(taxable × 0.15)
total       = taxable + vat
```

Points that are easy to get wrong, and are pinned by tests:

- Delivery is judged on the **discounted** value, not the subtotal.
- An **empty** cart never pays delivery.
- VAT is applied to goods **plus** delivery.
- Rounding is **half-up**, not banker's rounding. `6074.865 → 6074.87`.
- `offline.js` does all of this in **integer cents**. Do not "simplify" it to
  floats.

Constants live in `Back-end/config/settings.py` and are copied into
`data.js` by `dump_store_data`, so change them there, not in `offline.js`:

```python
STORE_VAT_RATE = "0.15"
STORE_SHIPPING_FLAT = "99.00"
STORE_FREE_SHIPPING_THRESHOLD = "2500.00"
STORE_CURRENCY = "ZAR"
```

---

## 6. API surface

All under `/api/` (`Back-end/store/urls.py`). Every endpoint is public.

| Endpoint | Method | Notes |
| --- | --- | --- |
| `/api/` | GET | index describing the API |
| `/api/health/` | GET | status, currency, product count |
| `/api/products/` | GET | `search`, `category`, `brand` (repeatable **or** CSV), `min_price`, `max_price`, `in_stock`, `on_sale`, `sort`, `page`, `page_size` |
| `/api/products/<slug>/` | GET | adds `description`, `specs`, `related` |
| `/api/categories/` | GET | unpaginated |
| `/api/brands/` | GET | unpaginated |
| `/api/cart/price/` | POST | `{items:[{sku,quantity}], promo_code}` |
| `/api/promo/validate/` | POST | `{code}` |
| `/api/orders/` | POST | places an order, decrements stock |
| `/api/orders/<order_number>/` | GET | e.g. `GH-4A7C21` |
| `/api/contact/` | POST | logs a message |

List responses are DRF `PageNumberPagination`: `{count, next, previous, results}`.
Default `page_size` **12**, max **48**.

Sort keys (`SORT_OPTIONS` in `views.py`, mirrored by `SORTS` in `offline.js`):
`featured`, `price_asc`, `price_desc`, `rating`, `newest`, `name`.

**If you add, rename or remove a sort option, filter or API field, you must
change it in both `views.py` and `offline.js`** — otherwise the shop behaves
differently depending on whether Django happens to be running.

---

## 7. Change recipes

### "I changed the pricing rules"

Two files implement the same maths and **must be changed together**:

- `Back-end/store/pricing.py` — `quote()`
- `Front-end/Scripts/offline.js` — `priceCart()`

Then:

```powershell
cd Back-end
python ../Tests/_cart_fixtures.py > ../Tests/_fixtures.json
python ../Tests/_build_test.py
python Tests/_run_tests.py          # from the project root
```

If you change the constants in `settings.py`, also re-run
`python manage.py dump_store_data` so the snapshot picks them up.

### "I added or edited a product"

Edit it in the Django admin or `manage.py shell`, then:

```powershell
python manage.py dump_store_data
```

Forgetting this step is the most likely way to get confusing "the live shop and
the offline shop disagree" bugs.

### "I added a category, sort order or filter"

Update **both** `views.py` (`ProductListView`, `SORT_OPTIONS`) and `offline.js`
(`filterProducts()`, `SORTS`). The shop page filter checkboxes are built from
`/api/categories/` at runtime, so a new category appears automatically once the
data exists — but it needs the matching `category_slug` filter in both engines.

### "I added a field to Product"

1. Add the model field and make a migration.
2. Add it to `ProductListSerializer.Meta.fields` in `serializers.py`.
3. Re-run `dump_store_data`.
4. Render it in `ui.js` / `main.js` if it belongs on a card or the detail page.

The snapshot is generated from the serializer, so step 3 is what puts the field
into `data.js`.

### "I added a new page"

1. Create `Front-end/Templates/<name>.html`.
2. Give `<body>` a `data-page="<name>"` attribute — `main.js` dispatches on it.
3. Add a controller function and register it in the `PAGES` map in `main.js`.
4. Copy the `<head>` block from an existing page, **including the
   `data.js` / `offline.js` scripts**, or the page will render empty.
5. Add a nav link.
6. `_verify_frontend.py` will fail if `data-page` is missing or an asset path
   is wrong.

### "I changed the logo"

All 7 templates point at `../Images/logo.png`. `Images/logo.svg` is now unused
and kept only as a fallback. The `.brand-logo` rule in `style.css` gives the PNG
a rounded border because the file has a solid black plate baked in — if you
swap in a transparent logo you can drop the `border`/`box-shadow`.

### "I want to deploy this"

Not ready as-is. Before it goes anywhere public, read section 10.

---

## 8. Testing

### Front end

```powershell
python Tests/_run_tests.py
```

Three stages, none of which need Django running:

1. **`_check_scripts.py`** — every `.js` has balanced brackets and no string,
   comment or regex left open. Stands in for `node --check`, which is not
   available here.
2. **`_verify_frontend.py`** — every page has balanced tags, a `data-page`
   attribute, and only asset references that exist on disk.
3. **Browser tests** — headless Edge runs the shop and makes **123 assertions**,
   including every cart subtotal, discount, shipping, VAT and total, compared
   against fixtures generated by Django's own `quote()`.

A report is written to `Tests/_last_run.log`.

The browser tests need Microsoft Edge; if it is absent that stage is skipped
rather than failed.

> `Tests/_test_firstcall.*` exists because of a real bug: `hybrid()` has two
> code paths, and the first call on a fresh page takes the one that was broken.
> The main suite warms the API down first, so it cannot catch that on its own.
> **Keep that test when refactoring `api.js`.**

### Back end

```powershell
cd Back-end
python manage.py test
```

**37 tests**, covering pricing arithmetic, filters, sorting, pagination, cart
pricing, promo codes, order creation and validation, and the contact endpoint.

### Baseline as of 2026-10-05

| Suite | Result |
| --- | --- |
| Django tests | 37 passed |
| Browser assertions | 123 passed |
| JS structure | 6 files clean |
| Page structure | 7 pages clean |
| Live pages (Django up) | all 7 render, no offline notice |

---

## 9. Traps

Real bugs that were present in this codebase and cost time. All are fixed;
they are listed so they are not reintroduced.

### `arguments` inside a `.catch()` callback

`hybrid()` in `api.js` used to read `Array.prototype.slice.call(arguments, 2)`
**inside** its `.catch(function (error) { ... })`. In JS, `arguments` there
refers to the callback's own arguments — just the error — so the offline
fallback was called with **no arguments at all**. Symptom: every product page
404'd and carts priced as `R 0.00`, but only on the *first* request of a page
load. Now captured up front in `hybrid()`'s own scope.

### Two code paths in `hybrid()`

`hybrid()` has an early-return path (API already known to be down) and a
`catch` path (this request just failed). A test that warms the API down first
only exercises the first one. Any refactor of `api.js` needs both paths tested.

### Truncated function bodies

`main.js::applyTheme()` and `ui.js::refreshDrawer()` were both cut off
mid-function, leaving the rest of the file unbalanced — the site could not boot
at all. This is what `_check_scripts.py` now catches. If you ever see a JS file
"obviously broken", run it before assuming it is your fault.

### `logo.png` has a baked-in black plate

Swapping the logo in naively makes a black rectangle float in the header,
especially on the light theme. The `.brand-logo` rule handles it.

### CORS

`settings.py` whitelists `127.0.0.1:5500` and `:8080` (plus `localhost`
variants). If you serve the front end on a **different port**, add it there, or
add `DJANGO_CORS_EXTRA_ORIGINS` (comma separated) rather than editing the file.

### `data.js` is generated

Editing it by hand works right up until the next `dump_store_data` run wipes
your changes. The header comment in the file says so.

### `EXPIRED20` expires relative to seed time

`seed_products.py` sets its `valid_until` to "yesterday" every time it runs, so
it stays expired. The browser fixtures depend on that, so **re-seed then
re-generate fixtures**, in that order.

---

## 10. Known limitations

Things to fix before this becomes anything more than a demo:

- **No authentication or accounts.** Every API endpoint is public.
- **No real payment integration.** Checkout records an order and decrements
  stock; no money moves.
- **Not a git repository.** There is no version history. **Initialise one and
  commit before making substantial changes** — right now a bad edit is
  unrecoverable.
- **SQLite.** Fine for a demo; move to Postgres for real concurrency.
- **`DEBUG` and dev-server settings are development-oriented.** Not safe to
  expose publicly as-is.
- **No rate limiting, no CSRF story for the public write endpoints.**
- **Product images are category-level SVGs**, not per-product photography.
  `Product.image` is a `CharField` holding a path relative to `Front-end/`,
  which is what decouples the two servers — keep it that way unless you
  introduce real static file hosting.
- **`Back-end/store/classscan.txt`** is a stray leftover file. Safe to delete.
- **`Images/logo.svg`** is unused now that `logo.png` is wired up.

---

## 11. Environment

| | |
| --- | --- |
| Python | 3.14.3 (workspace `.venv` at `My_Projects/.venv`) |
| Django | 6.0.5 |
| djangorestframework | 3.17.1 |
| django-cors-headers | 4.9.0 |
| Node | **not installed** — hence the Python-based JS checker |
| Browser used for tests | Microsoft Edge (headless) |
| Database | `Back-end/db.sqlite3`, seeded |

`Back-end/requirements.txt` pins these versions.

---

## 12. Decision log

| Decision | Why |
| --- | --- |
| Keep Django as the source of truth, add an offline fallback | The user chose a hybrid store: live API when available, snapshot otherwise. It means the shop is never a blank page. |
| Generate `data.js` from the serializers | Hand-maintaining a parallel JSON file would silently drift from the database. |
| Fall back only on network failure, never on 4xx | A 404 is a real answer; masking it would hide bugs. |
| Refuse checkout/contact offline instead of faking | A demo must never look like a real transaction. |
| Integer-cent arithmetic in `offline.js` | Floats drift. `2499.99` must never become `2499.989999`. |
| Write accessors into `data-*` attributes and delegate from `document` | Cards arrive asynchronously; per-element wiring would break. |
| `python -m http.server` for the front end | Avoids CORS complexity and keeps the project dependency-free. |
| Python JS checker instead of `node --check` | Node is not installed in this workspace. |

---

## 13. Where things live (quick index)

| I want to… | Look in |
| --- | --- |
| Change a price | admin, or `seed_products.py`, then `dump_store_data` |
| Change VAT / delivery / currency | `Back-end/config/settings.py`, then `dump_store_data` |
| Change how a cart is priced | `pricing.py` **and** `offline.js`, then refresh fixtures |
| Add a product field | `models.py` → migrate → `serializers.py` → `dump_store_data` → `ui.js` |
| Change the shop page filters | `views.py` **and** `offline.js`, then `shop.html` |
| Change a product card | `ui.js::productCard()` |
| Change the header or footer | the `<head>`/`<header>` blocks in each template (they are duplicated per page) |
| Change colours or themes | `style.css` design tokens at the top of the file |
| Change what a page does | `main.js`, the `PAGES` map |
| Add a cart drawer or toast | `ui.js` |
| Regenerate the offline snapshot | `python manage.py dump_store_data` |
| Reset the demo catalogue | `python manage.py seed_products` |
| Change pricing in the **new** stack | `src/utils/pricing.ts` **and** `place_order()` in the migration |
| Change a page in the **new** stack | `src/pages/*` (routes are declared in `src/App.tsx`) |
| Change the header/footer in the **new** stack | `src/components/Layout.tsx` (once, not per page) |
| Change cart state or persistence | `src/state/cart.ts` (pure) and `src/state/CartContext.tsx` (wiring) |

---

## 14. The GitHub Pages + Supabase rewrite (in progress)

A second, modernised stack now sits alongside the legacy one. See
`FULLSTACK_GITHUB_PAGES_ARCHITECTURE.md` for the blueprint and `.clinerules` for
the agent-facing rules.

```
index.html                Vite entry
src/                      React + TypeScript + Tailwind
src/App.tsx               route table (shop, product, cart, confirmation, …)
src/pages/                one file per legacy template
src/state/                cart + catalogue providers (shared state)
src/components/           Layout (header/footer), ProductCard, totals
src/utils/pricing.ts      integer-cent cart maths (client)
public/images/products/   product artwork copied from Front-end/Images
supabase/migrations/      PostgreSQL schema + RLS + seed data
.github/workflows/        build and deploy dist/ to GitHub Pages
```

The seven legacy templates are now rebuilt as routes: `/`, `/shop`,
`/product/:slug`, `/cart`, `/confirmation`, `/about`, `/contact`, with a
catch-all 404. Shop filters and pagination live in the URL query string (same
links as before, e.g. `/shop?on_sale=1`), filtering is client-side over the
in-memory catalogue, and the page size (12) and sort keys match the Django API
so results order identically.

Nothing in `Front-end/` or `Back-end/` has been deleted. The legacy store still
runs and is still the reference implementation the new code is checked against.

### ⚠️ The pricing rule now exists in FOUR places

This is the single most important thing to know about the current codebase.
The same formula is implemented in:

| # | Location | Runs on |
| --- | --- | --- |
| 1 | `Back-end/store/pricing.py` → `quote()` | the legacy Django API |
| 2 | `Front-end/Scripts/offline.js` → `priceCart()` | the legacy offline shop |
| 3 | `src/utils/pricing.ts` → `calculateCartQuote()` | the new React app |
| 4 | `supabase/migrations/001_ecommerce_schema.sql` → `place_order()` | the new database |

**Change all four together.** Anything less means the shop quotes different
totals depending on which half of it is answering.

Two notes on that list:

- `offline.js` and `pricing.py` were written independently and are held in
  agreement by `Tests/_run_tests.py`.
- The blueprint's sample formula, `Math.round(taxable_cents * 0.15)`, was **not**
  copied — but not because it is wrong. An exhaustive sweep (`_probe_float.mjs`)
  shows it agrees with the integer form at every taxable value up to R 1,000,000
  and at every VAT rate tried. Integer arithmetic was chosen because it is exact
  by construction and matches Django's `ROUND_HALF_UP`, so the two engines
  cannot drift apart on rounding mode.

### Verified state

Node v24.21.0 / npm 11.19.0 are installed. The real gate now runs locally and
in CI:

```powershell
npm ci
npm run typecheck     # tsc --noEmit        -> 0 errors
npm test              # vitest              -> 34 passed
npm run build         # vite build          -> dist/
```

Last run: 34/34 tests (23 pricing + 11 cart), clean typecheck, 99 modules
built. `dist/index.html` references `/GHOSTINC_STORE/assets/…` and carries no
bare `/assets/` paths, which is what the deploy workflow asserts before
publishing. The product artwork and logo land in `dist/` too.

Bundle: ~133 kB gzipped total, split into `react` + router (53.6 kB gz),
`supabase` (58.9 kB gz), the app itself (15.8 kB gz) and the CSS (4.3 kB gz).

`package-lock.json` is committed, so CI's `npm ci` is reproducible.

### Supporting scripts

```powershell
cd Back-end
python ../_verify_pricing.py     # TS algorithm vs Django quote(), 9 carts
python ../_verify_seed.py        # Supabase seed vs the SQLite catalogue
python ../_export_seed.py        # regenerate the seed after a catalogue change
node ../_probe_float.mjs         # float-vs-integer VAT/rounding sweep
```

`_probe_float.mjs` is the evidence behind a decision that is easy to get wrong:
`Math.round(cents * 0.15)` and the integer form agree at every VAT rate and
every value up to R 1,000,000, so the integer form was **not** adopted to fix a
bug. It was adopted because it is exact by construction and matches Django's
`ROUND_HALF_UP`, removing any chance of the two engines disagreeing on rounding.

> Watch out: Python's `round()` is banker's rounding while JavaScript's
> `Math.round()` rounds half away from zero. They disagree on an exact `.5`, so
> do not use Python to predict what JS will do.

### Not yet done

- No `.env.local` has been filled in, and no migration has been applied to a
  real Supabase project, so the React app has never run against live data —
  it has only been typechecked, unit-tested and built. The first real click
  through of shop → cart → checkout is still owed.
- The React app has no tests for its *pages* (vitest runs in the node
  environment with no jsdom). Cart maths, cart state and pricing are covered;
  rendering is not.
- The legacy light/dark theme toggle was not carried over: the Tailwind design
  is dark-only. Shop filtering is client-side instead of paginated API calls,
  and the footer no longer links to the Django browsable API.
- `contact_messages` (migration 003) is write-only by design — there is no
  SELECT policy, so messages are read in the Supabase dashboard.
- No authentication. `place_order()` is callable by the anon role.
- Order numbers are short (`GH-` + 6 hex ≈ 16.7M), so `lookup_order()` is
  "lookup if you know the reference", not authentication. Put it behind a
  rate-limited Edge Function before launch.
- No seed migration has been applied to a real Supabase project yet.
