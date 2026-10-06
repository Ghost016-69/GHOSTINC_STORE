-- =========================================================================
-- 002_seed_catalogue.sql
--
-- GENERATED FILE - do not edit by hand.
--
-- Rebuild it with:
--     cd Back-end && python ../_export_seed.py
--
-- The same demo catalogue the Django back end ships with, converted to
-- integer cents so the Postgres and SQLite stores agree exactly.
-- Idempotent: keyed on slug / sku, so re-running updates in place.
-- =========================================================================

-- Categories ----------------------------------------------------------
INSERT INTO public.categories (slug, name, description, icon, sort_order)
VALUES ('phones', 'Phones', 'Flagships, mid-rangers and budget 5G handsets.', '📱', 1)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;
INSERT INTO public.categories (slug, name, description, icon, sort_order)
VALUES ('laptops', 'Laptops', 'Ultrabooks, creator rigs and dev machines.', '💻', 2)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;
INSERT INTO public.categories (slug, name, description, icon, sort_order)
VALUES ('audio', 'Audio', 'Headphones, earbuds and speakers.', '🎧', 3)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;
INSERT INTO public.categories (slug, name, description, icon, sort_order)
VALUES ('gaming', 'Gaming', 'Keyboards, mice, controllers and VR.', '🎮', 4)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;
INSERT INTO public.categories (slug, name, description, icon, sort_order)
VALUES ('wearables', 'Wearables', 'Smartwatches and fitness bands.', '⌚', 5)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;
INSERT INTO public.categories (slug, name, description, icon, sort_order)
VALUES ('displays', 'Displays', 'Monitors for work, play and everything between.', '🖥', 6)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;
INSERT INTO public.categories (slug, name, description, icon, sort_order)
VALUES ('power', 'Power', 'Chargers, power banks and cables that last.', '🔌', 7)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;
INSERT INTO public.categories (slug, name, description, icon, sort_order)
VALUES ('accessories', 'Accessories', 'The small things that make a setup work.', '🖱', 8)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

-- Brands --------------------------------------------------------------
INSERT INTO public.brands (slug, name, blurb)
VALUES ('aureus', 'Aureus', 'Premium smartwatches and GaN charging.')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  blurb = EXCLUDED.blurb;
INSERT INTO public.brands (slug, name, blurb)
VALUES ('cobalt-systems', 'Cobalt Systems', 'Developer machines and battery tech.')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  blurb = EXCLUDED.blurb;
INSERT INTO public.brands (slug, name, blurb)
VALUES ('ghost-labs', 'Ghost Labs', 'Our own house brand: built to be repaired.')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  blurb = EXCLUDED.blurb;
INSERT INTO public.brands (slug, name, blurb)
VALUES ('helios-audio', 'Helios Audio', 'Reference sound, closed-back comfort.')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  blurb = EXCLUDED.blurb;
INSERT INTO public.brands (slug, name, blurb)
VALUES ('ironclad', 'Ironclad', 'Mechanical peripherals rated for 100 million clicks.')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  blurb = EXCLUDED.blurb;
INSERT INTO public.brands (slug, name, blurb)
VALUES ('kestrel-devices', 'Kestrel Devices', 'Affordable wearables and earbuds.')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  blurb = EXCLUDED.blurb;
INSERT INTO public.brands (slug, name, blurb)
VALUES ('lumen-optics', 'Lumen Optics', 'Colour-accurate panels, factory calibrated.')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  blurb = EXCLUDED.blurb;
INSERT INTO public.brands (slug, name, blurb)
VALUES ('northwind', 'Northwind', 'Travel-hardened laptops and sleeves.')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  blurb = EXCLUDED.blurb;
INSERT INTO public.brands (slug, name, blurb)
VALUES ('novacore', 'Novacore', 'Mid-range phones that punch above their price.')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  blurb = EXCLUDED.blurb;
INSERT INTO public.brands (slug, name, blurb)
VALUES ('orbital-tech', 'Orbital Tech', 'Budget devices for the courier-and-drop crowd.')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  blurb = EXCLUDED.blurb;
INSERT INTO public.brands (slug, name, blurb)
VALUES ('pixel-forge', 'Pixel Forge', 'Workstations and studio lighting for creators.')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  blurb = EXCLUDED.blurb;
INSERT INTO public.brands (slug, name, blurb)
VALUES ('quantum-grid', 'Quantum Grid', 'Controllers and VR hardware.')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  blurb = EXCLUDED.blurb;
INSERT INTO public.brands (slug, name, blurb)
VALUES ('vantablack', 'Vantablack', 'Silent, matte-black performance laptops.')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  blurb = EXCLUDED.blurb;
INSERT INTO public.brands (slug, name, blurb)
VALUES ('zephyr', 'Zephyr', 'Speakers and solar power for outdoor setups.')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  blurb = EXCLUDED.blurb;

-- Promo codes -------------------------------------------------------
-- EXPIRED20 is deliberately already expired, so the expiry branch is
-- exercised the first time the shop loads.
INSERT INTO public.promo_codes (code, percent_off, description, is_active, valid_until)
VALUES ('EXPIRED20', 20, 'Retired campaign code, kept to prove expiry is enforced.', true, '2026-10-01T22:08:26.078719+00:00')
ON CONFLICT (code) DO UPDATE SET
  percent_off = EXCLUDED.percent_off,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  valid_until = EXCLUDED.valid_until;
INSERT INTO public.promo_codes (code, percent_off, description, is_active, valid_until)
VALUES ('GHOST10', 10, '10% off your order - welcome to GHOSTINC.', true, NULL)
ON CONFLICT (code) DO UPDATE SET
  percent_off = EXCLUDED.percent_off,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  valid_until = EXCLUDED.valid_until;
INSERT INTO public.promo_codes (code, percent_off, description, is_active, valid_until)
VALUES ('TECH15', 15, '15% off during the tech refresh sale.', true, NULL)
ON CONFLICT (code) DO UPDATE SET
  percent_off = EXCLUDED.percent_off,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  valid_until = EXCLUDED.valid_until;

-- Products -----------------------------------------------------------
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-AU-001',
  'Aero Wireless ANC Headphones',
  'aero-wireless-anc-headphones',
  (SELECT id FROM public.categories WHERE slug = 'audio'),
  (SELECT id FROM public.brands WHERE slug = 'helios-audio'),
  549900,
  649900,
  18,
  5,
  'Over-ear noise cancelling with 60 hours of battery.',
  'Reference-tuned over-ear cans with adaptive noise cancelling that actually copes with an aircraft cabin. 60 hours with ANC off, 40 with it on, and earcups that do not clamp.',
  '{"Type": "Over-ear, closed back", "Battery": "60 h (40 h with ANC)", "Codecs": "SBC, AAC, LDAC", "Connectivity": "Bluetooth 5.4, USB-C, 3.5 mm", "Weight": "268 g", "Charge": "USB-C, 10 min gives 5 h"}'::jsonb,
  'Images/products/audio.svg',
  4.70,
  240,
  'new',
  true
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-PH-001',
  'Ghost X1 Pro 5G',
  'ghost-x1-pro-5g',
  (SELECT id FROM public.categories WHERE slug = 'phones'),
  (SELECT id FROM public.brands WHERE slug = 'ghost-labs'),
  1899900,
  2099900,
  11,
  5,
  '6.7 inch 120 Hz OLED, 5000 mAh and a 50 MP triple camera.',
  'Our flagship, and the one we would buy ourselves. A 6.7 inch LTPO OLED panel at 120 Hz, a 5000 mAh battery that genuinely lasts two days of real use, and a 50 MP main camera. Seven years of security updates and a battery you can replace with a screwdriver.',
  '{"Display": "6.7 inch LTPO OLED, 120 Hz", "Chipset": "Ghost G3, 4 nm", "Battery": "5000 mAh, 80 W wired", "Camera": "50 MP + 12 MP + 10 MP", "Storage": "256 GB", "Protection": "IP68"}'::jsonb,
  'Images/products/phones.svg',
  4.80,
  120,
  'new',
  true
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-GM-001',
  'Ironclad K87 Mechanical Keyboard',
  'ironclad-k87-mechanical-keyboard',
  (SELECT id FROM public.categories WHERE slug = 'gaming'),
  (SELECT id FROM public.brands WHERE slug = 'ironclad'),
  169900,
  NULL,
  25,
  5,
  'Hot-swappable 87-key board on a gasket mount.',
  'A tenkeyless board with hot-swap sockets, a gasket mount that softens the bottom-out, and double-shot keycaps instead of printed ones. Switch it, lube it, keep it for a decade.',
  '{"Layout": "87 keys, TKL", "Switches": "Hot-swappable, tactile", "Mount": "Gasket", "Connectivity": "USB-C, Bluetooth, 2.4 GHz", "Keycaps": "Double-shot PBT", "Polling": "1000 Hz"}'::jsonb,
  'Images/products/gaming.svg',
  4.60,
  190,
  'new',
  true
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-DP-001',
  'Lumen 27 4K Studio Monitor',
  'lumen-27-4k-studio-monitor',
  (SELECT id FROM public.categories WHERE slug = 'displays'),
  (SELECT id FROM public.brands WHERE slug = 'lumen-optics'),
  949900,
  NULL,
  6,
  5,
  '27 inch 4K, 99% DCI-P3, single-cable laptop docking.',
  'A 4K panel calibrated at the factory with 99% DCI-P3 coverage and a USB-C port that carries video, data and 90 W of charging over one cable. A built-in KVM switches between two machines.',
  '{"Panel": "27 inch IPS 4K, 60 Hz", "Colour": "99% DCI-P3, Delta-E under 2", "Ports": "USB-C 90 W, 2x HDMI, DP, 4x USB", "Extras": "Built-in KVM, height adjustable", "HDR": "DisplayHDR 600"}'::jsonb,
  'Images/products/displays.svg',
  4.80,
  73,
  'new',
  true
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-PH-003',
  'Nova 7 Pro',
  'nova-7-pro',
  (SELECT id FROM public.categories WHERE slug = 'phones'),
  (SELECT id FROM public.brands WHERE slug = 'novacore'),
  899900,
  999900,
  20,
  5,
  'Mid-range money, near-flagship camera.',
  'The sensible upgrade. A large 120 Hz AMOLED, a stabilised main camera that holds up at night, and 45 W charging. Two years of updates, which is honest for the price.',
  '{"Display": "6.6 inch AMOLED, 120 Hz", "Chipset": "Novacore N5", "Battery": "5000 mAh, 45 W wired", "Camera": "64 MP OIS + 8 MP + 2 MP", "Storage": "256 GB", "Protection": "IP54"}'::jsonb,
  'Images/products/phones.svg',
  4.40,
  210,
  'new',
  true
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-GM-004',
  'Quantum Grid VR One',
  'quantum-grid-vr-one',
  (SELECT id FROM public.categories WHERE slug = 'gaming'),
  (SELECT id FROM public.brands WHERE slug = 'quantum-grid'),
  949900,
  1099900,
  5,
  5,
  'Standalone VR, inside-out tracking, no cables.',
  'A standalone headset: two 2064x2208 panels per eye, inside-out tracking that needs no base stations, and controllers that charge from the same cable as the headset.',
  '{"Displays": "2064x2208 per eye, 120 Hz", "Tracking": "Inside-out, 6 DoF", "Field of view": "110 degrees", "Storage": "256 GB", "Battery": "2.5 h", "Weight": "515 g"}'::jsonb,
  'Images/products/gaming.svg',
  4.50,
  41,
  'new',
  true
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-LP-001',
  'Vanta 14 Ultrabook',
  'vanta-14-ultrabook',
  (SELECT id FROM public.categories WHERE slug = 'laptops'),
  (SELECT id FROM public.brands WHERE slug = 'vantablack'),
  3299900,
  NULL,
  6,
  5,
  '1.1 kg magnesium chassis, 20 hours of battery, silent all day.',
  'A 14 inch machine that weighs 1.1 kg and runs cool enough to be genuinely fanless in everyday use. 20 hours of real battery, a colour-accurate panel, and a keyboard that survives long writing sessions.',
  '{"Display": "14 inch 2880x1800, 120 Hz", "Processor": "12-core, 24 thread", "Memory": "32 GB LPDDR5", "Storage": "1 TB NVMe", "Battery": "72 Wh, 20 h typical", "Weight": "1.1 kg"}'::jsonb,
  'Images/products/laptops.svg',
  4.80,
  64,
  'new',
  true
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-AU-002',
  'Air Buds Pro',
  'air-buds-pro',
  (SELECT id FROM public.categories WHERE slug = 'audio'),
  (SELECT id FROM public.brands WHERE slug = 'helios-audio'),
  100000,
  NULL,
  30,
  5,
  'Bargain in-ears with surprisingly capable ANC.',
  'The price makes you suspicious until you put them in. The noise cancelling is real, the case is pocket-sized, and they get through a week of commutes on one charge.',
  '{"Type": "In-ear, silicone tips", "Battery": "7 h buds, 28 h with case", "Codecs": "SBC, AAC", "Connectivity": "Bluetooth 5.3", "Water resistance": "IPX4", "Charge": "USB-C, wireless"}'::jsonb,
  'Images/products/audio.svg',
  4.20,
  44,
  'new',
  false
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-PW-002',
  'Aureus GaN 100 W Charger',
  'aureus-gan-100-w-charger',
  (SELECT id FROM public.categories WHERE slug = 'power'),
  (SELECT id FROM public.brands WHERE slug = 'aureus'),
  129900,
  149900,
  28,
  5,
  'One charger for a laptop, tablet and phone.',
  'Gallium nitride makes 100 W fit in something the size of a matchbox. Three ports, intelligent power splitting, and folding pins so it stops puncturing your bag.',
  '{"Power": "100 W total", "Ports": "2x USB-C, 1x USB-A", "Technology": "GaN III", "Extras": "Folding pins, travel adapters", "Weight": "180 g"}'::jsonb,
  'Images/products/power.svg',
  4.60,
  140,
  'new',
  false
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-WR-001',
  'Aureus Pulse 3 Smartwatch',
  'aureus-pulse-3-smartwatch',
  (SELECT id FROM public.categories WHERE slug = 'wearables'),
  (SELECT id FROM public.brands WHERE slug = 'aureus'),
  499900,
  NULL,
  14,
  5,
  'Sapphire glass, 10-day battery, dual-band GPS.',
  'A smartwatch that looks like a watch. Sapphire crystal, a titanium case, dual-band GPS that holds a lock under trees, and a battery measured in days rather than hours.',
  '{"Display": "1.43 inch AMOLED, always on", "Battery": "10 days typical", "Sensors": "Heart rate, SpO2, dual-band GPS", "Water resistance": "10 ATM", "Case": "Titanium, sapphire crystal", "Weight": "52 g"}'::jsonb,
  'Images/products/wearables.svg',
  4.60,
  118,
  'new',
  false
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-LP-003',
  'Cobalt Dev 13',
  'cobalt-dev-13',
  (SELECT id FROM public.categories WHERE slug = 'laptops'),
  (SELECT id FROM public.brands WHERE slug = 'cobalt-systems'),
  2199900,
  NULL,
  9,
  5,
  'A developer laptop with a keyboard worth typing on.',
  'Built for people who live in a terminal. Deep key travel, a matte display that stays readable next to a window, and enough memory to keep a database, three containers and a browser open at once.',
  '{"Display": "13.3 inch matte IPS, 60 Hz", "Processor": "10-core", "Memory": "32 GB DDR5", "Storage": "1 TB NVMe", "Battery": "60 Wh, 14 h typical", "Ports": "2x USB-C, 2x USB-A, HDMI"}'::jsonb,
  'Images/products/laptops.svg',
  4.50,
  52,
  'new',
  false
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-PW-001',
  'Cobalt Fuel 20K Power Bank',
  'cobalt-fuel-20k-power-bank',
  (SELECT id FROM public.categories WHERE slug = 'power'),
  (SELECT id FROM public.brands WHERE slug = 'cobalt-systems'),
  89900,
  NULL,
  55,
  5,
  '20 000 mAh with a screen that tells you the truth.',
  'A 20 000 mAh cell that charges a laptop, a phone and earbuds at once. The little display shows the exact percentage remaining instead of four unhelpful dots.',
  '{"Capacity": "20 000 mAh", "Output": "100 W USB-C PD, 2x USB-A", "Input": "USB-C 65 W", "Display": "Percentage readout", "Weight": "420 g"}'::jsonb,
  'Images/products/power.svg',
  4.50,
  260,
  'new',
  false
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-AC-001',
  'Ghost 3-in-1 Charging Stand',
  'ghost-3-in-1-charging-stand',
  (SELECT id FROM public.categories WHERE slug = 'accessories'),
  (SELECT id FROM public.brands WHERE slug = 'ghost-labs'),
  149900,
  NULL,
  19,
  5,
  'Charge phone, watch and earbuds on one desk stand.',
  'A magnetic charging stand for a phone, a watch and a pair of earbuds, with a fan that keeps the coils cool so charging never slows down halfway through.',
  '{"Devices": "Phone, watch, earbuds", "Power": "30 W total", "Magnet": "15 W magnetic phone mount", "Extras": "Quiet cooling fan", "Weight": "410 g"}'::jsonb,
  'Images/products/accessories.svg',
  4.40,
  61,
  'new',
  false
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-PH-002',
  'Ghost X1',
  'ghost-x1',
  (SELECT id FROM public.categories WHERE slug = 'phones'),
  (SELECT id FROM public.brands WHERE slug = 'ghost-labs'),
  1349900,
  NULL,
  8,
  5,
  'The X1 Pro in a smaller, one-handed 6.1 inch body.',
  'Everything we like about the X1 Pro, shrunk to a 6.1 inch body you can actually reach across with one thumb. Same chipset, same software promise, a slightly smaller 4500 mAh battery.',
  '{"Display": "6.1 inch OLED, 120 Hz", "Chipset": "Ghost G3, 4 nm", "Battery": "4500 mAh, 66 W wired", "Camera": "50 MP + 12 MP", "Storage": "128 GB", "Protection": "IP68"}'::jsonb,
  'Images/products/phones.svg',
  4.60,
  86,
  'new',
  false
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-PH-009',
  'Ghost X1 Lite',
  'ghost-x1-lite',
  (SELECT id FROM public.categories WHERE slug = 'phones'),
  (SELECT id FROM public.brands WHERE slug = 'ghost-labs'),
  149900,
  NULL,
  0,
  5,
  'Entry-level Ghost handset, currently between production runs.',
  'The cheapest way into the Ghost software promise. We have sold out of this run and the next batch lands next month; the page is kept up so you can see what is coming.',
  '{"Display": "6.5 inch LCD, 90 Hz", "Chipset": "Ghost G1", "Battery": "5000 mAh, 18 W wired", "Camera": "13 MP", "Storage": "64 GB", "Protection": "IP53"}'::jsonb,
  'Images/products/phones.svg',
  4.10,
  15,
  'new',
  false
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-AC-002',
  'Ironclad Braided USB-C Cable',
  'ironclad-braided-usb-c-cable',
  (SELECT id FROM public.categories WHERE slug = 'accessories'),
  (SELECT id FROM public.brands WHERE slug = 'ironclad'),
  24900,
  29900,
  120,
  5,
  '240 W and 40 Gbps, braided so it outlives the device.',
  'A cable rated for 240 W and 40 Gbps, in a braided jacket that survives being yanked out at an angle, with strain relief that actually relieves strain. Two metres.',
  '{"Length": "2 m", "Power": "240 W", "Data": "40 Gbps", "Jacket": "Braided nylon", "Connector": "USB-C to USB-C"}'::jsonb,
  'Images/products/accessories.svg',
  4.50,
  330,
  'new',
  false
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-GM-002',
  'Ironclad Lightweight Mouse',
  'ironclad-lightweight-mouse',
  (SELECT id FROM public.categories WHERE slug = 'gaming'),
  (SELECT id FROM public.brands WHERE slug = 'ironclad'),
  109900,
  129900,
  34,
  5,
  '58 grams, 26 000 DPI, 100 million clicks.',
  'Light enough to flick across a large mousepad without thinking, with optical switches rated for 100 million clicks and 60 hours of battery at 1000 Hz polling.',
  '{"Sensor": "26 000 DPI optical", "Weight": "58 g", "Switches": "Optical, 100 M clicks", "Battery": "60 h at 1000 Hz", "Connectivity": "2.4 GHz, Bluetooth, USB-C", "Feet": "PTFE"}'::jsonb,
  'Images/products/gaming.svg',
  4.50,
  152,
  'new',
  false
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-AU-005',
  'Kestrel Buds 2',
  'kestrel-buds-2',
  (SELECT id FROM public.categories WHERE slug = 'audio'),
  (SELECT id FROM public.brands WHERE slug = 'kestrel-devices'),
  89900,
  NULL,
  60,
  5,
  'No-frills earbuds that stay in while you run.',
  'Three tip sizes in the box, a wing that keeps them locked in place, and a low-latency mode so video does not drift out of sync.',
  '{"Type": "In-ear with wing tips", "Battery": "6 h buds, 24 h with case", "Codecs": "SBC, AAC", "Connectivity": "Bluetooth 5.3", "Water resistance": "IPX5", "Extras": "Low latency mode"}'::jsonb,
  'Images/products/audio.svg',
  4.10,
  88,
  'new',
  false
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-WR-002',
  'Kestrel Fit Band',
  'kestrel-fit-band',
  (SELECT id FROM public.categories WHERE slug = 'wearables'),
  (SELECT id FROM public.brands WHERE slug = 'kestrel-devices'),
  99900,
  119900,
  45,
  5,
  'Two weeks of battery and honest sleep tracking.',
  'No ECG claims, no nonsense. It counts steps, watches your sleep and runs for fourteen days between charges, which is the only spec that really matters on a band.',
  '{"Display": "1.1 inch AMOLED", "Battery": "14 days", "Sensors": "Heart rate, SpO2, accelerometer", "Water resistance": "5 ATM", "Weight": "24 g"}'::jsonb,
  'Images/products/wearables.svg',
  4.20,
  205,
  'new',
  false
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-DP-002',
  'Lumen 32 Ultrawide',
  'lumen-32-ultrawide',
  (SELECT id FROM public.categories WHERE slug = 'displays'),
  (SELECT id FROM public.brands WHERE slug = 'lumen-optics'),
  1399900,
  1549900,
  4,
  5,
  'A 32 inch curved ultrawide that replaces two monitors.',
  '5120x1440 of desktop, curved so the edges stay readable, with a 144 Hz refresh that makes it a gaming screen as well as a work one.',
  '{"Panel": "32 inch VA ultrawide 5120x1440, 144 Hz", "Curvature": "1000R", "Colour": "95% DCI-P3", "Ports": "USB-C 65 W, 2x HDMI, DP, 3x USB", "HDR": "DisplayHDR 400"}'::jsonb,
  'Images/products/displays.svg',
  4.70,
  36,
  'new',
  false
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-AC-003',
  'Northwind Laptop Sleeve',
  'northwind-laptop-sleeve',
  (SELECT id FROM public.categories WHERE slug = 'accessories'),
  (SELECT id FROM public.brands WHERE slug = 'northwind'),
  54900,
  NULL,
  26,
  5,
  'Water-resistant felt sleeve with a cable pocket.',
  'A sleeve that holds a 14 inch laptop, a charger and a cable in separate pockets, in a water-resistant felt that does not look like a laptop bag.',
  '{"Fits": "13 to 14 inch laptops", "Material": "Recycled felt, water resistant", "Pockets": "Laptop, charger, cables", "Closure": "Magnetic flap"}'::jsonb,
  'Images/products/accessories.svg',
  4.30,
  84,
  'new',
  false
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-LP-004',
  'Northwind Trail 14',
  'northwind-trail-14',
  (SELECT id FROM public.categories WHERE slug = 'laptops'),
  (SELECT id FROM public.brands WHERE slug = 'northwind'),
  1599900,
  1799900,
  11,
  5,
  'Drop-tested, spill-resistant, and honest about its panel.',
  'A workhorse that has been dropped onto concrete and had coffee poured over the keyboard on purpose. A slightly dim but very tough screen, easily replaced storage, and a battery that charges from a car socket.',
  '{"Display": "14 inch IPS, 60 Hz", "Processor": "8-core", "Memory": "16 GB DDR5", "Storage": "512 GB NVMe", "Battery": "56 Wh, 12 h typical", "Durability": "MIL-STD drop tested"}'::jsonb,
  'Images/products/laptops.svg',
  4.30,
  77,
  'new',
  false
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-PH-004',
  'Nova 7',
  'nova-7',
  (SELECT id FROM public.categories WHERE slug = 'phones'),
  (SELECT id FROM public.brands WHERE slug = 'novacore'),
  649900,
  NULL,
  16,
  5,
  'The dependable day-to-day handset.',
  'A tidy 6.5 inch LCD at 90 Hz with a huge battery. Not exciting, but it will still be working happily in three years, which is the point.',
  '{"Display": "6.5 inch LCD, 90 Hz", "Chipset": "Novacore N4", "Battery": "5200 mAh, 33 W wired", "Camera": "50 MP + 2 MP", "Storage": "128 GB", "Protection": "IP52"}'::jsonb,
  'Images/products/phones.svg',
  4.30,
  145,
  'new',
  false
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-PH-005',
  'Orbital V5',
  'orbital-v5',
  (SELECT id FROM public.categories WHERE slug = 'phones'),
  (SELECT id FROM public.brands WHERE slug = 'orbital-tech'),
  279900,
  NULL,
  40,
  5,
  'A reliable, repairable first smartphone.',
  'Built for the courier-and-drop life: a plastic body that shrugs off a fall, a battery that lasts three days, and a back cover that pops off so you can replace the cell yourself.',
  '{"Display": "6.5 inch LCD, 60 Hz", "Chipset": "Orbital O3", "Battery": "6000 mAh, 18 W wired", "Camera": "13 MP + 2 MP", "Storage": "64 GB, microSD", "Protection": "Splash resistant"}'::jsonb,
  'Images/products/phones.svg',
  4.00,
  320,
  'new',
  false
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-LP-005',
  'Pixel Forge Studio 15',
  'pixel-forge-studio-15',
  (SELECT id FROM public.categories WHERE slug = 'laptops'),
  (SELECT id FROM public.brands WHERE slug = 'pixel-forge'),
  3899900,
  NULL,
  3,
  5,
  'Factory-calibrated panel with a hardware colour wheel.',
  'The panel is the product: factory calibrated to Delta-E under one, with a hardware colour wheel that adjusts the backlight rather than the image, so the grade you set is the grade you keep.',
  '{"Display": "15.6 inch OLED 4K, 120 Hz", "Processor": "14-core", "Memory": "32 GB", "Storage": "1 TB NVMe", "Colour": "Delta-E under 1, calibrated", "Weight": "1.9 kg"}'::jsonb,
  'Images/products/laptops.svg',
  4.60,
  21,
  'new',
  false
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-GM-003',
  'Quantum Grid Controller',
  'quantum-grid-controller',
  (SELECT id FROM public.categories WHERE slug = 'gaming'),
  (SELECT id FROM public.brands WHERE slug = 'quantum-grid'),
  149900,
  NULL,
  12,
  5,
  'Hall-effect sticks, so stick drift cannot happen.',
  'Hall-effect thumbsticks and triggers mean drift is not physically possible. Remappable back paddles and four profiles you can switch without installing anything.',
  '{"Sticks": "Hall effect, anti-drift", "Triggers": "Hall effect, adjustable", "Extras": "4 back paddles, 4 profiles", "Battery": "40 h", "Connectivity": "Bluetooth, 2.4 GHz, USB-C", "Works with": "PC, mobile, smart TV"}'::jsonb,
  'Images/products/gaming.svg',
  4.40,
  96,
  'new',
  false
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-AU-003',
  'Reference Monitor Headset',
  'reference-monitor-headset',
  (SELECT id FROM public.categories WHERE slug = 'audio'),
  (SELECT id FROM public.brands WHERE slug = 'helios-audio'),
  300000,
  NULL,
  2,
  5,
  'Flat-response studio cans that add no colour.',
  'Deliberately unexciting: a flat response curve so mixes translate. Not the pair for a party, the pair for finishing a track.',
  '{"Type": "Over-ear, open back", "Impedance": "250 ohm", "Response": "5 Hz - 35 kHz", "Connectivity": "3.5 mm, 6.35 mm adapter", "Weight": "290 g", "Cable": "Detachable 3 m"}'::jsonb,
  'Images/products/audio.svg',
  4.60,
  9,
  'new',
  false
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-LP-002',
  'Vanta 16 Creator',
  'vanta-16-creator',
  (SELECT id FROM public.categories WHERE slug = 'laptops'),
  (SELECT id FROM public.brands WHERE slug = 'vantablack'),
  4499900,
  4799900,
  4,
  5,
  'Sixteen inches of calibrated colour and a discrete GPU.',
  'For people who move big files for a living. A 16 inch mini-LED panel calibrated at the factory, a discrete GPU for timeline scrubbing, and a card reader because nobody wants a dongle.',
  '{"Display": "16 inch mini-LED 3200x2000, 165 Hz", "Processor": "16-core", "Memory": "64 GB", "Storage": "2 TB NVMe", "Graphics": "Discrete 12 GB", "Weight": "2.1 kg"}'::jsonb,
  'Images/products/laptops.svg',
  4.70,
  38,
  'new',
  false
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-AU-004',
  'Zephyr Boom 30 Speaker',
  'zephyr-boom-30-speaker',
  (SELECT id FROM public.categories WHERE slug = 'audio'),
  (SELECT id FROM public.brands WHERE slug = 'zephyr'),
  179900,
  209900,
  22,
  5,
  'A portable speaker that survives the beach.',
  'Loud enough for a braai, sealed enough to float, and it charges other devices from its own battery. Thirty hours is not a typo.',
  '{"Output": "30 W stereo", "Battery": "30 h", "Water resistance": "IP67, floats", "Connectivity": "Bluetooth 5.3, AUX", "Extras": "Powerbank output, stereo pairing", "Weight": "1.1 kg"}'::jsonb,
  'Images/products/audio.svg',
  4.30,
  130,
  'new',
  false
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
INSERT INTO public.products (
  sku, name, slug, category_id, brand_id,
  price_cents, compare_at_cents, stock, low_stock_threshold,
  short_description, description, specs, image_path,
  rating, rating_count, condition, is_featured
)
VALUES (
  'GH-PW-003',
  'Zephyr Solar Bank',
  'zephyr-solar-bank',
  (SELECT id FROM public.categories WHERE slug = 'power'),
  (SELECT id FROM public.brands WHERE slug = 'zephyr'),
  219900,
  NULL,
  3,
  5,
  'Solar top-up for load-shedding and camping.',
  'A rugged power bank with a fold-out solar panel. Slow to charge from the sun, quick from a wall, and it will keep a router, a lamp and two phones alive through a long outage.',
  '{"Capacity": "26 800 mAh", "Solar": "Fold-out 5 W panel", "Output": "65 W USB-C PD, 2x USB-A", "Extras": "Camping light, IP65 body", "Weight": "760 g"}'::jsonb,
  'Images/products/power.svg',
  4.30,
  48,
  'new',
  false
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  category_id = EXCLUDED.category_id,
  brand_id = EXCLUDED.brand_id,
  price_cents = EXCLUDED.price_cents,
  compare_at_cents = EXCLUDED.compare_at_cents,
  stock = EXCLUDED.stock,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  specs = EXCLUDED.specs,
  image_path = EXCLUDED.image_path,
  rating = EXCLUDED.rating,
  rating_count = EXCLUDED.rating_count,
  condition = EXCLUDED.condition,
  is_featured = EXCLUDED.is_featured,
  is_active = true;
