-- =============================================================================
-- 001_ecommerce_schema.sql
-- GHOSTINC_STORE — Supabase schema
--
-- Replaces the Django models in Back-end/store/models.py with PostgreSQL, and
-- reproduces their behaviour, including the derived fields that used to be
-- Python properties (is_on_sale, discount_percent, low_stock).
--
-- Conventions carried over from the legacy app:
--   * Money is ALWAYS an integer number of cents. There is no float or numeric
--     money column anywhere in this schema, and none should be added.
--   * The store rules (VAT 15%, R99 flat delivery, free over R2500) live in
--     src/utils/pricing.ts on the client and in place_order() below on the
--     server. Keep all three in step.
--
-- Apply with:  supabase db push   (or paste into the SQL editor)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- Categories
-- -----------------------------------------------------------------------------
CREATE TABLE public.categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  icon        TEXT,
  sort_order  INT  NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Brands
-- -----------------------------------------------------------------------------
CREATE TABLE public.brands (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  blurb      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Products
--
-- The four GENERATED columns reproduce the @property methods on the old Django
-- Product model. Keeping them in the database means the client cannot disagree
-- with the server about whether something is on sale.
-- -----------------------------------------------------------------------------
CREATE TABLE public.products (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku                 TEXT UNIQUE NOT NULL,
  name                TEXT NOT NULL,
  slug                TEXT UNIQUE NOT NULL,

  category_id         UUID REFERENCES public.categories(id) ON DELETE RESTRICT,
  brand_id            UUID REFERENCES public.brands(id)     ON DELETE RESTRICT,

  -- Money. 249900 = R 2 499.00. Never store a float.
  price_cents         INT NOT NULL CHECK (price_cents >= 0),
  -- Struck-through "was" price, NULL when the item is not discounted.
  compare_at_cents    INT CHECK (compare_at_cents IS NULL OR compare_at_cents > 0),

  stock               INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  low_stock_threshold INT NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),

  short_description   TEXT,
  description         TEXT,
  -- Ordered spec rows, e.g. {"Display": "6.7 inch OLED"}.
  specs               JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Relative to Front-end/, e.g. "Images/products/phones.svg".
  image_path          TEXT,

  rating              NUMERIC(3,2) NOT NULL DEFAULT 0.00
                        CHECK (rating >= 0 AND rating <= 5),
  rating_count        INT NOT NULL DEFAULT 0 CHECK (rating_count >= 0),

  condition           TEXT NOT NULL DEFAULT 'new'
                        CHECK (condition IN ('new', 'refurbished', 'open-box')),
  is_featured         BOOLEAN NOT NULL DEFAULT false,
  is_active           BOOLEAN NOT NULL DEFAULT true,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Derived, mirroring the Django properties.
  in_stock BOOLEAN GENERATED ALWAYS AS (
    is_active AND stock > 0
  ) STORED,

  low_stock BOOLEAN GENERATED ALWAYS AS (
    is_active AND stock > 0 AND stock <= low_stock_threshold
  ) STORED,

  is_on_sale BOOLEAN GENERATED ALWAYS AS (
    compare_at_cents IS NOT NULL AND compare_at_cents > price_cents
  ) STORED,

  -- Whole percent off. Django uses int(percent.to_integral_value()); round()
  -- on numeric rounds half away from zero, which agrees on real data.
  -- The CASE guards the divide-by-zero when compare_at_cents is NULL.
  discount_percent INT GENERATED ALWAYS AS (
    CASE
      WHEN compare_at_cents IS NOT NULL AND compare_at_cents > price_cents
        THEN CAST(ROUND(((compare_at_cents - price_cents) * 100.0) / compare_at_cents) AS INT)
      ELSE 0
    END
  ) STORED
);

COMMENT ON COLUMN public.products.price_cents IS
  'Integer cents. 249900 = R 2 499.00. Never a float.';
COMMENT ON COLUMN public.products.compare_at_cents IS
  'Original price in cents, struck through when on sale. NULL when not on sale.';

-- -----------------------------------------------------------------------------
-- Orders
-- -----------------------------------------------------------------------------
CREATE TABLE public.orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number     TEXT UNIQUE NOT NULL,
  promo_code       TEXT,

  customer_email   TEXT NOT NULL,
  customer_name    TEXT NOT NULL,
  customer_phone   TEXT,
  shipping_address JSONB NOT NULL,

  -- Totals are stored, never recomputed on read, and are produced by
  -- place_order() using the same integer rules as src/utils/pricing.ts.
  subtotal_cents   INT NOT NULL CHECK (subtotal_cents >= 0),
  discount_cents   INT NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  shipping_cents   INT NOT NULL DEFAULT 9900 CHECK (shipping_cents >= 0),
  vat_cents        INT NOT NULL CHECK (vat_cents >= 0),
  total_cents      INT NOT NULL CHECK (total_cents >= 0),

  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'paid', 'shipped', 'cancelled')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Order items
--
-- name / sku / unit price are snapshotted so a later price change never rewrites
-- order history — the same decision as OrderItem in the Django model.
-- -----------------------------------------------------------------------------
CREATE TABLE public.order_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         UUID NOT NULL REFERENCES public.orders(id)   ON DELETE CASCADE,
  product_id       UUID        REFERENCES public.products(id) ON DELETE SET NULL,
  product_sku      TEXT NOT NULL,
  product_name     TEXT NOT NULL,
  product_slug     TEXT,
  unit_price_cents INT NOT NULL CHECK (unit_price_cents >= 0),
  quantity         INT NOT NULL CHECK (quantity > 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Promo codes
-- -----------------------------------------------------------------------------
CREATE TABLE public.promo_codes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code         TEXT UNIQUE NOT NULL CHECK (code = upper(code)),
  percent_off  INT NOT NULL CHECK (percent_off BETWEEN 1 AND 90),
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  valid_until  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_brand    ON public.products(brand_id);
CREATE INDEX idx_products_slug     ON public.products(slug);
CREATE INDEX idx_products_active   ON public.products(is_active, is_featured);
CREATE INDEX idx_products_price    ON public.products(price_cents);
CREATE INDEX idx_orders_number     ON public.orders(order_number);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);

-- Keep updated_at honest.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Category / brand product counts
--
-- The old API exposed product_count as a serializer field. A view is cheaper
-- and safer than trusting the client to count.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.categories_with_counts AS
  SELECT c.*,
         COALESCE(counts.product_count, 0) AS product_count
    FROM public.categories c
    LEFT JOIN (
      SELECT category_id, COUNT(*) AS product_count
        FROM public.products
       WHERE is_active
       GROUP BY category_id
    ) counts ON counts.category_id = c.id;

CREATE OR REPLACE VIEW public.brands_with_counts AS
  SELECT b.*,
         COALESCE(counts.product_count, 0) AS product_count
    FROM public.brands b
    LEFT JOIN (
      SELECT brand_id, COUNT(*) AS product_count
        FROM public.products
       WHERE is_active
       GROUP BY brand_id
    ) counts ON counts.brand_id = b.id;

-- =============================================================================
-- Row Level Security
--
-- The anon key ships inside the JavaScript bundle, so it is public. These
-- policies are the entire security boundary: anything the anon role may read,
-- anyone can read.
--
-- A note on orders: the blueprint proposes
--     CREATE POLICY "Order lookup" ON orders FOR SELECT USING (true);
-- which is deliberately NOT used here. With USING (true) the anon key can
-- SELECT every row in orders — every customer's name, email and address — not
-- just the one order they asked for. Instead there is no direct SELECT policy
-- on orders at all; lookups go through lookup_order(), which returns a single
-- order by its reference.
--
-- Residual risk to be aware of: order numbers look like "GH-4A7C21", roughly
-- 16.7 million possibilities, so they are not unguessable. Before launch, put
-- lookup_order() behind a rate-limited Edge Function, or require sign-in.
-- =============================================================================

ALTER TABLE public.categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- There is deliberately no INSERT/UPDATE/DELETE policy for the catalogue:
-- RLS denies by default, so only the service_role key (server-side, or the
-- Supabase dashboard) can change products.

-- Catalogue: readable by everyone.
CREATE POLICY "Public read: categories"
  ON public.categories FOR SELECT
  USING (is_active);

CREATE POLICY "Public read: brands"
  ON public.brands FOR SELECT
  USING (true);

CREATE POLICY "Public read: products"
  ON public.products FOR SELECT
  USING (is_active);

-- Promo codes: only live ones are readable, so an expired code is not even
-- discoverable. Prices are not secret.
CREATE POLICY "Public read: live promo codes"
  ON public.promo_codes FOR SELECT
  USING (is_active AND (valid_until IS NULL OR valid_until > now()));

-- =============================================================================
-- place_order()
--
-- Re-prices the cart on the server, validates stock, and decrements it — all
-- in one transaction. This exists because an INSERT policy on orders would let
-- a caller write any total they liked, and because the legacy Django app
-- decremented stock when an order was placed.
--
-- SECURITY DEFINER lets it write to tables the anon role cannot.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.place_order(
  p_email       TEXT,
  p_name        TEXT,
  p_address     JSONB,
  p_items       JSONB,
  p_promo_code  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Store rules. Keep in step with settings.py and src/utils/pricing.ts.
  vat_permille      CONSTANT INT := 150;              -- 15%
  shipping_flat     CONSTANT INT := 9900;              -- R 99.00
  free_ship_over    CONSTANT INT := 250000;            -- R 2 500.00

  v_item        JSONB;
  v_lines       JSONB := '[]'::jsonb;  -- priced lines, accumulated
  v_product     products%ROWTYPE;
  v_promo       promo_codes%ROWTYPE;
  v_order_id    UUID;
  v_order_no    TEXT;
  v_qty         INT;

  v_subtotal    INT := 0;
  v_units       INT := 0;
  v_discount    INT := 0;
  v_discounted  INT;
  v_shipping    INT;
  v_taxable     INT;
  v_vat         INT;
  v_total       INT;
  v_code        TEXT;
BEGIN
  -- -- input checks -------------------------------------------------------
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Your cart is empty.' USING ERRCODE = '22023';
  END IF;

  IF coalesce(btrim(p_email), '') = '' OR position('@' IN p_email) = 0 THEN
    RAISE EXCEPTION 'A valid email address is required.' USING ERRCODE = '22023';
  END IF;

  IF coalesce(btrim(p_name), '') = '' THEN
    RAISE EXCEPTION 'A delivery name is required.' USING ERRCODE = '22023';
  END IF;

  IF p_address IS NULL OR coalesce(btrim(p_address::text), '') IN ('', '{}') THEN
    RAISE EXCEPTION 'A delivery address is required.' USING ERRCODE = '22023';
  END IF;

  v_code := upper(btrim(coalesce(p_promo_code, '')));

  -- -- price the cart, line by line ---------------------------------------
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := coalesce((v_item ->> 'quantity')::INT, 0);
    v_qty := GREATEST(LEAST(v_qty, 99), 1);

    SELECT * INTO v_product
      FROM public.products
     WHERE sku = v_item ->> 'sku'
       AND is_active;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unknown product: %', v_item ->> 'sku'
        USING ERRCODE = '22023';
    END IF;

    IF v_product.stock < v_qty THEN
      RAISE EXCEPTION '%: only % left, you asked for %.',
        v_product.name, v_product.stock, v_qty
        USING ERRCODE = '22023';
    END IF;

    v_subtotal := v_subtotal + (v_product.price_cents * v_qty);
    v_units    := v_units + v_qty;

    -- Accumulate the priced line. The price comes from the database, never
    -- from the request, so a caller cannot understate what they owe.
    v_lines := v_lines || jsonb_build_array(
      v_item || jsonb_build_object(
        'product_id',       v_product.id,
        'product_name',     v_product.name,
        'product_slug',     v_product.slug,
        'unit_price_cents', v_product.price_cents,
        'quantity',         v_qty
      )
    );
  END LOOP;

  -- -- discount ----------------------------------------------------------
  IF v_code <> '' THEN
    SELECT * INTO v_promo
      FROM public.promo_codes
     WHERE code = v_code
       AND is_active
       AND (valid_until IS NULL OR valid_until > now());

    IF NOT FOUND THEN
      RAISE EXCEPTION 'That promo code is not valid.' USING ERRCODE = '22023';
    END IF;

    -- Half-up on integers: (x * pct + 50) / 100
    v_discount := (v_subtotal * v_promo.percent_off + 50) / 100;
  END IF;

  v_discounted := v_subtotal - v_discount;

  -- -- delivery ----------------------------------------------------------
  -- Judged on the DISCOUNTED value, and an empty cart never pays delivery.
  IF v_units = 0 THEN
    v_shipping := 0;
  ELSIF v_discounted >= free_ship_over THEN
    v_shipping := 0;
  ELSE
    v_shipping := shipping_flat;
  END IF;

  -- -- tax and total ------------------------------------------------------
  -- VAT applies to goods plus delivery. Half-up: (x * permille + 500) / 1000
  v_taxable := v_discounted + v_shipping;
  v_vat     := (v_taxable * vat_permille + 500) / 1000;
  v_total   := v_taxable + v_vat;

  -- -- persist ------------------------------------------------------------
  v_order_no := 'GH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  INSERT INTO public.orders (
    order_number, promo_code, customer_email, customer_name,
    shipping_address, subtotal_cents, discount_cents,
    shipping_cents, vat_cents, total_cents, status
  )
  VALUES (
    v_order_no,
    NULLIF(v_code, ''),
    p_email,
    p_name,
    p_address,
    v_subtotal, v_discount, v_shipping, v_vat, v_total,
    'pending'
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id, product_id, product_sku, product_name,
    product_slug, unit_price_cents, quantity
  )
  SELECT
    v_order_id,
    (line ->> 'product_id')::UUID,
    line ->> 'sku',
    line ->> 'product_name',
    line ->> 'product_slug',
    (line ->> 'unit_price_cents')::INT,
    (line ->> 'quantity')::INT
  FROM jsonb_array_elements(v_lines) AS line;

  -- Take the stock off, now that the order exists.
  UPDATE public.products p
     SET stock = p.stock - (line ->> 'quantity')::INT
    FROM jsonb_array_elements(v_lines) AS line
   WHERE p.id = (line ->> 'product_id')::UUID;

  RETURN jsonb_build_object(
    'order_number',    v_order_no,
    'item_count',      v_units,
    'subtotal_cents',  v_subtotal,
    'discount_cents',  v_discount,
    'shipping_cents',  v_shipping,
    'vat_cents',       v_vat,
    'total_cents',     v_total,
    'currency',        'ZAR',
    'items',           v_lines
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- lookup_order()
--
-- Replaces the blueprint's blanket "Order lookup by order_number USING (true)"
-- policy. There is no SELECT policy on orders at all, so the anon key cannot
-- list or dump the table; this function returns exactly one order, and only
-- when its reference matches.
--
-- Order numbers are short, so treat this as "lookup if you know the reference",
-- not as authentication. See the warning at the RLS section above.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.lookup_order(p_order_number TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order
    FROM public.orders
   WHERE order_number = upper(btrim(coalesce(p_order_number, '')))
     AND created_at > now() - INTERVAL '90 days';

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'order_number',    v_order.order_number,
    'status',          v_order.status,
    'created_at',      v_order.created_at,
    'customer_name',   v_order.customer_name,
    'customer_email',  v_order.customer_email,
    'subtotal_cents',  v_order.subtotal_cents,
    'discount_cents',  v_order.discount_cents,
    'shipping_cents',  v_order.shipping_cents,
    'vat_cents',       v_order.vat_cents,
    'total_cents',     v_order.total_cents,
    'currency',        'ZAR',
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'product_name',     oi.product_name,
        'product_sku',      oi.product_sku,
        'product_slug',     oi.product_slug,
        'unit_price_cents', oi.unit_price_cents,
        'quantity',         oi.quantity,
        'line_total_cents', oi.unit_price_cents * oi.quantity
      ) ORDER BY oi.created_at)
        FROM public.order_items oi
       WHERE oi.order_id = v_order.id
    ), '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Grants
--
-- By default a new function is executable by PUBLIC. Both functions are
-- SECURITY DEFINER, so that default is too broad: revoke it and hand back only
-- what the browser actually needs.
-- =============================================================================

REVOKE ALL ON FUNCTION public.place_order(TEXT, TEXT, JSONB, JSONB, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lookup_order(TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.place_order(TEXT, TEXT, JSONB, JSONB, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_order(TEXT) TO anon, authenticated;

-- The tables are already covered by RLS, but revoking the blanket grant keeps
-- an accidental policy change from becoming a data leak.
GRANT SELECT ON public.categories, public.brands, public.products, public.promo_codes TO anon, authenticated;
GRANT SELECT ON public.categories_with_counts, public.brands_with_counts TO anon, authenticated;

REVOKE ALL ON public.orders, public.order_items FROM anon, authenticated;

-- =============================================================================
-- Row level security on the views
--
-- Views do not inherit the RLS of their underlying tables, and by default they
-- run as the view owner, which would bypass it. These are security_invoker
-- views so the policies above still apply.
-- =============================================================================

ALTER VIEW public.categories_with_counts SET (security_invoker = true);
ALTER VIEW public.brands_with_counts SET (security_invoker = true);
