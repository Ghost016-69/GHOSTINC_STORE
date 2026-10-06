"""
Seeds the GHOSTINC store with a demo catalogue.

Run it with::

    python manage.py seed_products

The command is idempotent: every row is keyed on its SKU (or slug, for the
categories and brands), so running it twice updates the existing records rather
than duplicating them. That makes it safe to re-run after editing the data
below, which is the whole point of keeping the catalogue in version control.

Product images point at the SVG artwork that ships with the front end, e.g.
``Images/products/phones.svg``. The path is relative to the ``Front-end``
folder, so replacing the artwork with real photography is a one-field change
per product in the Django admin.

The seed is demo data, not real inventory: the brands are invented and the
prices are plausible South African retail prices rather than anything scraped
from a real shop.
"""

from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from store.models import Brand, Category, Product, PromoCode

# (name, slug, icon, description, sort order)
CATEGORIES = [
    ("Phones", "phones", "\U0001F4F1", "Flagships, mid-rangers and budget 5G handsets.", 1),
    ("Laptops", "laptops", "\U0001F4BB", "Ultrabooks, creator rigs and dev machines.", 2),
    ("Audio", "audio", "\U0001F3A7", "Headphones, earbuds and speakers.", 3),
    ("Gaming", "gaming", "\U0001F3AE", "Keyboards, mice, controllers and VR.", 4),
    ("Wearables", "wearables", "\u231A", "Smartwatches and fitness bands.", 5),
    ("Displays", "displays", "\U0001F5A5", "Monitors for work, play and everything between.", 6),
    ("Power", "power", "\U0001F50C", "Chargers, power banks and cables that last.", 7),
    ("Accessories", "accessories", "\U0001F5B1", "The small things that make a setup work.", 8),
]

# (name, slug, blurb)
BRANDS = [
    ("Ghost Labs", "ghost-labs", "Our own house brand: built to be repaired."),
    ("Novacore", "novacore", "Mid-range phones that punch above their price."),
    ("Orbital Tech", "orbital-tech", "Budget devices for the courier-and-drop crowd."),
    ("Vantablack", "vantablack", "Silent, matte-black performance laptops."),
    ("Cobalt Systems", "cobalt-systems", "Developer machines and battery tech."),
    ("Pixel Forge", "pixel-forge", "Workstations and studio lighting for creators."),
    ("Northwind", "northwind", "Travel-hardened laptops and sleeves."),
    ("Helios Audio", "helios-audio", "Reference sound, closed-back comfort."),
    ("Zephyr", "zephyr", "Speakers and solar power for outdoor setups."),
    ("Kestrel Devices", "kestrel-devices", "Affordable wearables and earbuds."),
    ("Ironclad", "ironclad", "Mechanical peripherals rated for 100 million clicks."),
    ("Quantum Grid", "quantum-grid", "Controllers and VR hardware."),
    ("Aureus", "aureus", "Premium smartwatches and GaN charging."),
    ("Lumen Optics", "lumen-optics", "Colour-accurate panels, factory calibrated."),
]

# (code, percent off, description)
PROMO_CODES = [
    ("GHOST10", 10, "10% off your order - welcome to GHOSTINC."),
    ("TECH15", 15, "15% off during the tech refresh sale."),
    ("EXPIRED20", 20, "Retired campaign code, kept to prove expiry is enforced."),
]

# Column order for every row in PRODUCTS below. Rows are plain tuples to keep
# this file readable at a glance; ``_product_kwargs`` turns one into a dict.
PRODUCT_COLUMNS = (
    "sku",
    "name",
    "brand",
    "category",
    "price",
    "compare_at",
    "stock",
    "rating",
    "rating_count",
    "featured",
    "short_description",
    "description",
    "specs",
)


# sku, name, brand, category, price, compare_at, stock, rating, count,
# featured, short description, description, specs
PRODUCTS = [
    # -- Phones ------------------------------------------------------------
    (
        "GH-PH-001", "Ghost X1 Pro 5G", "Ghost Labs", "phones",
        "18999.00", "20999.00", 12, "4.80", 120, True,
        "6.7 inch 120 Hz OLED, 5000 mAh and a 50 MP triple camera.",
        "Our flagship, and the one we would buy ourselves. A 6.7 inch LTPO "
        "OLED panel at 120 Hz, a 5000 mAh battery that genuinely lasts two "
        "days of real use, and a 50 MP main camera. Seven years of security "
        "updates and a battery you can replace with a screwdriver.",
        {
            "Display": "6.7 inch LTPO OLED, 120 Hz",
            "Chipset": "Ghost G3, 4 nm",
            "Battery": "5000 mAh, 80 W wired",
            "Camera": "50 MP + 12 MP + 10 MP",
            "Storage": "256 GB",
            "Protection": "IP68",
        },
    ),
    (
        "GH-PH-002", "Ghost X1", "Ghost Labs", "phones",
        "13499.00", None, 8, "4.60", 86, False,
        "The X1 Pro in a smaller, one-handed 6.1 inch body.",
        "Everything we like about the X1 Pro, shrunk to a 6.1 inch body you "
        "can actually reach across with one thumb. Same chipset, same "
        "software promise, a slightly smaller 4500 mAh battery.",
        {
            "Display": "6.1 inch OLED, 120 Hz",
            "Chipset": "Ghost G3, 4 nm",
            "Battery": "4500 mAh, 66 W wired",
            "Camera": "50 MP + 12 MP",
            "Storage": "128 GB",
            "Protection": "IP68",
        },
    ),
    (
        "GH-PH-003", "Nova 7 Pro", "Novacore", "phones",
        "8999.00", "9999.00", 20, "4.40", 210, True,
        "Mid-range money, near-flagship camera.",
        "The sensible upgrade. A large 120 Hz AMOLED, a stabilised main "
        "camera that holds up at night, and 45 W charging. Two years of "
        "updates, which is honest for the price.",
        {
            "Display": "6.6 inch AMOLED, 120 Hz",
            "Chipset": "Novacore N5",
            "Battery": "5000 mAh, 45 W wired",
            "Camera": "64 MP OIS + 8 MP + 2 MP",
            "Storage": "256 GB",
            "Protection": "IP54",
        },
    ),
    (
        "GH-PH-004", "Nova 7", "Novacore", "phones",
        "6499.00", None, 16, "4.30", 145, False,
        "The dependable day-to-day handset.",
        "A tidy 6.5 inch LCD at 90 Hz with a huge battery. Not exciting, but "
        "it will still be working happily in three years, which is the point.",
        {
            "Display": "6.5 inch LCD, 90 Hz",
            "Chipset": "Novacore N4",
            "Battery": "5200 mAh, 33 W wired",
            "Camera": "50 MP + 2 MP",
            "Storage": "128 GB",
            "Protection": "IP52",
        },
    ),
    (
        "GH-PH-005", "Orbital V5", "Orbital Tech", "phones",
        "2799.00", None, 40, "4.00", 320, False,
        "A reliable, repairable first smartphone.",
        "Built for the courier-and-drop life: a plastic body that shrugs off "
        "a fall, a battery that lasts three days, and a back cover that pops "
        "off so you can replace the cell yourself.",
        {
            "Display": "6.5 inch LCD, 60 Hz",
            "Chipset": "Orbital O3",
            "Battery": "6000 mAh, 18 W wired",
            "Camera": "13 MP + 2 MP",
            "Storage": "64 GB, microSD",
            "Protection": "Splash resistant",
        },
    ),
    (
        "GH-PH-009", "Ghost X1 Lite", "Ghost Labs", "phones",
        "1499.00", None, 0, "4.10", 15, False,
        "Entry-level Ghost handset, currently between production runs.",
        "The cheapest way into the Ghost software promise. We have sold out "
        "of this run and the next batch lands next month; the page is kept up "
        "so you can see what is coming.",
        {
            "Display": "6.5 inch LCD, 90 Hz",
            "Chipset": "Ghost G1",
            "Battery": "5000 mAh, 18 W wired",
            "Camera": "13 MP",
            "Storage": "64 GB",
            "Protection": "IP53",
        },
    ),

    # -- Laptops -----------------------------------------------------------
    (
        "GH-LP-001", "Vanta 14 Ultrabook", "Vantablack", "laptops",
        "32999.00", None, 6, "4.80", 64, True,
        "1.1 kg magnesium chassis, 20 hours of battery, silent all day.",
        "A 14 inch machine that weighs 1.1 kg and runs cool enough to be "
        "genuinely fanless in everyday use. 20 hours of real battery, a "
        "colour-accurate panel, and a keyboard that survives long writing "
        "sessions.",
        {
            "Display": "14 inch 2880x1800, 120 Hz",
            "Processor": "12-core, 24 thread",
            "Memory": "32 GB LPDDR5",
            "Storage": "1 TB NVMe",
            "Battery": "72 Wh, 20 h typical",
            "Weight": "1.1 kg",
        },
    ),
    (
        "GH-LP-002", "Vanta 16 Creator", "Vantablack", "laptops",
        "44999.00", "47999.00", 4, "4.70", 38, False,
        "Sixteen inches of calibrated colour and a discrete GPU.",
        "For people who move big files for a living. A 16 inch mini-LED panel "
        "calibrated at the factory, a discrete GPU for timeline scrubbing, and "
        "a card reader because nobody wants a dongle.",
        {
            "Display": "16 inch mini-LED 3200x2000, 165 Hz",
            "Processor": "16-core",
            "Memory": "64 GB",
            "Storage": "2 TB NVMe",
            "Graphics": "Discrete 12 GB",
            "Weight": "2.1 kg",
        },
    ),
    (
        "GH-LP-003", "Cobalt Dev 13", "Cobalt Systems", "laptops",
        "21999.00", None, 9, "4.50", 52, False,
        "A developer laptop with a keyboard worth typing on.",
        "Built for people who live in a terminal. Deep key travel, a matte "
        "display that stays readable next to a window, and enough memory to "
        "keep a database, three containers and a browser open at once.",
        {
            "Display": "13.3 inch matte IPS, 60 Hz",
            "Processor": "10-core",
            "Memory": "32 GB DDR5",
            "Storage": "1 TB NVMe",
            "Battery": "60 Wh, 14 h typical",
            "Ports": "2x USB-C, 2x USB-A, HDMI",
        },
    ),
    (
        "GH-LP-004", "Northwind Trail 14", "Northwind", "laptops",
        "15999.00", "17999.00", 11, "4.30", 77, False,
        "Drop-tested, spill-resistant, and honest about its panel.",
        "A workhorse that has been dropped onto concrete and had coffee "
        "poured over the keyboard on purpose. A slightly dim but very tough "
        "screen, easily replaced storage, and a battery that charges from a "
        "car socket.",
        {
            "Display": "14 inch IPS, 60 Hz",
            "Processor": "8-core",
            "Memory": "16 GB DDR5",
            "Storage": "512 GB NVMe",
            "Battery": "56 Wh, 12 h typical",
            "Durability": "MIL-STD drop tested",
        },
    ),
    (
        "GH-LP-005", "Pixel Forge Studio 15", "Pixel Forge", "laptops",
        "38999.00", None, 3, "4.60", 21, False,
        "Factory-calibrated panel with a hardware colour wheel.",
        "The panel is the product: factory calibrated to Delta-E under one, "
        "with a hardware colour wheel that adjusts the backlight rather than "
        "the image, so the grade you set is the grade you keep.",
        {
            "Display": "15.6 inch OLED 4K, 120 Hz",
            "Processor": "14-core",
            "Memory": "32 GB",
            "Storage": "1 TB NVMe",
            "Colour": "Delta-E under 1, calibrated",
            "Weight": "1.9 kg",
        },
    ),

    # -- Audio -------------------------------------------------------------
    (
        "GH-AU-001", "Aero Wireless ANC Headphones", "Helios Audio", "audio",
        "5499.00", "6499.00", 18, "4.70", 240, True,
        "Over-ear noise cancelling with 60 hours of battery.",
        "Reference-tuned over-ear cans with adaptive noise cancelling that "
        "actually copes with an aircraft cabin. 60 hours with ANC off, 40 with "
        "it on, and earcups that do not clamp.",
        {
            "Type": "Over-ear, closed back",
            "Battery": "60 h (40 h with ANC)",
            "Codecs": "SBC, AAC, LDAC",
            "Connectivity": "Bluetooth 5.4, USB-C, 3.5 mm",
            "Weight": "268 g",
            "Charge": "USB-C, 10 min gives 5 h",
        },
    ),
    (
        "GH-AU-002", "Air Buds Pro", "Helios Audio", "audio",
        "1000.00", None, 30, "4.20", 44, False,
        "Bargain in-ears with surprisingly capable ANC.",
        "The price makes you suspicious until you put them in. The noise "
        "cancelling is real, the case is pocket-sized, and they get through a "
        "week of commutes on one charge.",
        {
            "Type": "In-ear, silicone tips",
            "Battery": "7 h buds, 28 h with case",
            "Codecs": "SBC, AAC",
            "Connectivity": "Bluetooth 5.3",
            "Water resistance": "IPX4",
            "Charge": "USB-C, wireless",
        },
    ),
    (
        "GH-AU-003", "Reference Monitor Headset", "Helios Audio", "audio",
        "3000.00", None, 2, "4.60", 9, False,
        "Flat-response studio cans that add no colour.",
        "Deliberately unexciting: a flat response curve so mixes translate. "
        "Not the pair for a party, the pair for finishing a track.",
        {
            "Type": "Over-ear, open back",
            "Impedance": "250 ohm",
            "Response": "5 Hz - 35 kHz",
            "Connectivity": "3.5 mm, 6.35 mm adapter",
            "Weight": "290 g",
            "Cable": "Detachable 3 m",
        },
    ),
    (
        "GH-AU-004", "Zephyr Boom 30 Speaker", "Zephyr", "audio",
        "1799.00", "2099.00", 22, "4.30", 130, False,
        "A portable speaker that survives the beach.",
        "Loud enough for a braai, sealed enough to float, and it charges other "
        "devices from its own battery. Thirty hours is not a typo.",
        {
            "Output": "30 W stereo",
            "Battery": "30 h",
            "Water resistance": "IP67, floats",
            "Connectivity": "Bluetooth 5.3, AUX",
            "Extras": "Powerbank output, stereo pairing",
            "Weight": "1.1 kg",
        },
    ),
    (
        "GH-AU-005", "Kestrel Buds 2", "Kestrel Devices", "audio",
        "899.00", None, 60, "4.10", 88, False,
        "No-frills earbuds that stay in while you run.",
        "Three tip sizes in the box, a wing that keeps them locked in place, "
        "and a low-latency mode so video does not drift out of sync.",
        {
            "Type": "In-ear with wing tips",
            "Battery": "6 h buds, 24 h with case",
            "Codecs": "SBC, AAC",
            "Connectivity": "Bluetooth 5.3",
            "Water resistance": "IPX5",
            "Extras": "Low latency mode",
        },
    ),

    # -- Gaming ------------------------------------------------------------
    (
        "GH-GM-001", "Ironclad K87 Mechanical Keyboard", "Ironclad", "gaming",
        "1699.00", None, 25, "4.60", 190, True,
        "Hot-swappable 87-key board on a gasket mount.",
        "A tenkeyless board with hot-swap sockets, a gasket mount that softens "
        "the bottom-out, and double-shot keycaps instead of printed ones. "
        "Switch it, lube it, keep it for a decade.",
        {
            "Layout": "87 keys, TKL",
            "Switches": "Hot-swappable, tactile",
            "Mount": "Gasket",
            "Connectivity": "USB-C, Bluetooth, 2.4 GHz",
            "Keycaps": "Double-shot PBT",
            "Polling": "1000 Hz",
        },
    ),
    (
        "GH-GM-002", "Ironclad Lightweight Mouse", "Ironclad", "gaming",
        "1099.00", "1299.00", 34, "4.50", 152, False,
        "58 grams, 26 000 DPI, 100 million clicks.",
        "Light enough to flick across a large mousepad without thinking, with "
        "optical switches rated for 100 million clicks and 60 hours of battery "
        "at 1000 Hz polling.",
        {
            "Sensor": "26 000 DPI optical",
            "Weight": "58 g",
            "Switches": "Optical, 100 M clicks",
            "Battery": "60 h at 1000 Hz",
            "Connectivity": "2.4 GHz, Bluetooth, USB-C",
            "Feet": "PTFE",
        },
    ),
    (
        "GH-GM-003", "Quantum Grid Controller", "Quantum Grid", "gaming",
        "1499.00", None, 12, "4.40", 96, False,
        "Hall-effect sticks, so stick drift cannot happen.",
        "Hall-effect thumbsticks and triggers mean drift is not physically "
        "possible. Remappable back paddles and four profiles you can switch "
        "without installing anything.",
        {
            "Sticks": "Hall effect, anti-drift",
            "Triggers": "Hall effect, adjustable",
            "Extras": "4 back paddles, 4 profiles",
            "Battery": "40 h",
            "Connectivity": "Bluetooth, 2.4 GHz, USB-C",
            "Works with": "PC, mobile, smart TV",
        },
    ),
    (
        "GH-GM-004", "Quantum Grid VR One", "Quantum Grid", "gaming",
        "9499.00", "10999.00", 5, "4.50", 41, True,
        "Standalone VR, inside-out tracking, no cables.",
        "A standalone headset: two 2064x2208 panels per eye, inside-out "
        "tracking that needs no base stations, and controllers that charge "
        "from the same cable as the headset.",
        {
            "Displays": "2064x2208 per eye, 120 Hz",
            "Tracking": "Inside-out, 6 DoF",
            "Field of view": "110 degrees",
            "Storage": "256 GB",
            "Battery": "2.5 h",
            "Weight": "515 g",
        },
    ),

    # -- Wearables ---------------------------------------------------------
    (
        "GH-WR-001", "Aureus Pulse 3 Smartwatch", "Aureus", "wearables",
        "4999.00", None, 14, "4.60", 118, False,
        "Sapphire glass, 10-day battery, dual-band GPS.",
        "A smartwatch that looks like a watch. Sapphire crystal, a titanium "
        "case, dual-band GPS that holds a lock under trees, and a battery "
        "measured in days rather than hours.",
        {
            "Display": "1.43 inch AMOLED, always on",
            "Battery": "10 days typical",
            "Sensors": "Heart rate, SpO2, dual-band GPS",
            "Water resistance": "10 ATM",
            "Case": "Titanium, sapphire crystal",
            "Weight": "52 g",
        },
    ),
    (
        "GH-WR-002", "Kestrel Fit Band", "Kestrel Devices", "wearables",
        "999.00", "1199.00", 45, "4.20", 205, False,
        "Two weeks of battery and honest sleep tracking.",
        "No ECG claims, no nonsense. It counts steps, watches your sleep and "
        "runs for fourteen days between charges, which is the only spec that "
        "really matters on a band.",
        {
            "Display": "1.1 inch AMOLED",
            "Battery": "14 days",
            "Sensors": "Heart rate, SpO2, accelerometer",
            "Water resistance": "5 ATM",
            "Weight": "24 g",
        },
    ),

    # -- Displays ----------------------------------------------------------
    (
        "GH-DP-001", "Lumen 27 4K Studio Monitor", "Lumen Optics", "displays",
        "9499.00", None, 7, "4.80", 73, True,
        "27 inch 4K, 99% DCI-P3, single-cable laptop docking.",
        "A 4K panel calibrated at the factory with 99% DCI-P3 coverage and a "
        "USB-C port that carries video, data and 90 W of charging over one "
        "cable. A built-in KVM switches between two machines.",
        {
            "Panel": "27 inch IPS 4K, 60 Hz",
            "Colour": "99% DCI-P3, Delta-E under 2",
            "Ports": "USB-C 90 W, 2x HDMI, DP, 4x USB",
            "Extras": "Built-in KVM, height adjustable",
            "HDR": "DisplayHDR 600",
        },
    ),
    (
        "GH-DP-002", "Lumen 32 Ultrawide", "Lumen Optics", "displays",
        "13999.00", "15499.00", 4, "4.70", 36, False,
        "A 32 inch curved ultrawide that replaces two monitors.",
        "5120x1440 of desktop, curved so the edges stay readable, with a "
        "144 Hz refresh that makes it a gaming screen as well as a work one.",
        {
            "Panel": "32 inch VA ultrawide 5120x1440, 144 Hz",
            "Curvature": "1000R",
            "Colour": "95% DCI-P3",
            "Ports": "USB-C 65 W, 2x HDMI, DP, 3x USB",
            "HDR": "DisplayHDR 400",
        },
    ),

    # -- Power -------------------------------------------------------------
    (
        "GH-PW-001", "Cobalt Fuel 20K Power Bank", "Cobalt Systems", "power",
        "899.00", None, 55, "4.50", 260, False,
        "20 000 mAh with a screen that tells you the truth.",
        "A 20 000 mAh cell that charges a laptop, a phone and earbuds at once. "
        "The little display shows the exact percentage remaining instead of "
        "four unhelpful dots.",
        {
            "Capacity": "20 000 mAh",
            "Output": "100 W USB-C PD, 2x USB-A",
            "Input": "USB-C 65 W",
            "Display": "Percentage readout",
            "Weight": "420 g",
        },
    ),
    (
        "GH-PW-002", "Aureus GaN 100 W Charger", "Aureus", "power",
        "1299.00", "1499.00", 28, "4.60", 140, False,
        "One charger for a laptop, tablet and phone.",
        "Gallium nitride makes 100 W fit in something the size of a matchbox. "
        "Three ports, intelligent power splitting, and folding pins so it stops "
        "puncturing your bag.",
        {
            "Power": "100 W total",
            "Ports": "2x USB-C, 1x USB-A",
            "Technology": "GaN III",
            "Extras": "Folding pins, travel adapters",
            "Weight": "180 g",
        },
    ),
    (
        "GH-PW-003", "Zephyr Solar Bank", "Zephyr", "power",
        "2199.00", None, 3, "4.30", 48, False,
        "Solar top-up for load-shedding and camping.",
        "A rugged power bank with a fold-out solar panel. Slow to charge from "
        "the sun, quick from a wall, and it will keep a router, a lamp and two "
        "phones alive through a long outage.",
        {
            "Capacity": "26 800 mAh",
            "Solar": "Fold-out 5 W panel",
            "Output": "65 W USB-C PD, 2x USB-A",
            "Extras": "Camping light, IP65 body",
            "Weight": "760 g",
        },
    ),

    # -- Accessories -------------------------------------------------------
    (
        "GH-AC-001", "Ghost 3-in-1 Charging Stand", "Ghost Labs", "accessories",
        "1499.00", None, 19, "4.40", 61, False,
        "Charge phone, watch and earbuds on one desk stand.",
        "A magnetic charging stand for a phone, a watch and a pair of earbuds, "
        "with a fan that keeps the coils cool so charging never slows down "
        "halfway through.",
        {
            "Devices": "Phone, watch, earbuds",
            "Power": "30 W total",
            "Magnet": "15 W magnetic phone mount",
            "Extras": "Quiet cooling fan",
            "Weight": "410 g",
        },
    ),
    (
        "GH-AC-002", "Ironclad Braided USB-C Cable", "Ironclad", "accessories",
        "249.00", "299.00", 120, "4.50", 330, False,
        "240 W and 40 Gbps, braided so it outlives the device.",
        "A cable rated for 240 W and 40 Gbps, in a braided jacket that survives "
        "being yanked out at an angle, with strain relief that actually "
        "relieves strain. Two metres.",
        {
            "Length": "2 m",
            "Power": "240 W",
            "Data": "40 Gbps",
            "Jacket": "Braided nylon",
            "Connector": "USB-C to USB-C",
        },
    ),
    (
        "GH-AC-003", "Northwind Laptop Sleeve", "Northwind", "accessories",
        "549.00", None, 26, "4.30", 84, False,
        "Water-resistant felt sleeve with a cable pocket.",
        "A sleeve that holds a 14 inch laptop, a charger and a cable in "
        "separate pockets, in a water-resistant felt that does not look like a "
        "laptop bag.",
        {
            "Fits": "13 to 14 inch laptops",
            "Material": "Recycled felt, water resistant",
            "Pockets": "Laptop, charger, cables",
            "Closure": "Magnetic flap",
        },
    ),
]

# Which SVG artwork each category uses. Real photography would drop in here
# instead, one path per category, without touching any other code.
CATEGORY_IMAGES = {
    "phones": "Images/products/phones.svg",
    "laptops": "Images/products/laptops.svg",
    "audio": "Images/products/audio.svg",
    "gaming": "Images/products/gaming.svg",
    "wearables": "Images/products/wearables.svg",
    "displays": "Images/products/displays.svg",
    "power": "Images/products/power.svg",
    "accessories": "Images/products/accessories.svg",
}

# Codes that are deliberately expired, so the expiry rule can be demonstrated.
EXPIRED_CODES = {"EXPIRED20"}


class Command(BaseCommand):
    help = (
        "Seed the store with the demo catalogue. Idempotent, so it is safe to "
        "run repeatedly after editing the data in this file."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--fresh",
            action="store_true",
            help="Delete the existing catalogue before seeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["fresh"]:
            # Order items point at products with SET_NULL and orders keep their
            # own price snapshots, so the catalogue can be rebuilt safely.
            Product.objects.all().delete()
            self.stdout.write("Cleared the existing catalogue.")

        categories = self._seed_categories()
        brands = self._seed_brands()
        self._seed_promos()
        created, updated = self._seed_products(categories, brands)

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {len(categories)} categories, {len(brands)} brands, "
                f"{len(PROMO_CODES)} promo codes."
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Products: {created} created, {updated} updated "
                f"({len(PRODUCTS)} in total)."
            )
        )
        self.stdout.write(
            "Promo codes to try: GHOST10 (10% off) and TECH15 (15% off). "
            "EXPIRED20 is intentionally expired."
        )

    def _seed_categories(self):
        result = {}
        for index, row in enumerate(CATEGORIES):
            name, slug, icon, description, sort_order = row
            category, _ = Category.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "icon": icon,
                    "description": description,
                    "sort_order": sort_order,
                    "is_active": True,
                },
            )
            result[slug] = category
        return result

    def _seed_brands(self):
        result = {}
        for row in BRANDS:
            name, slug, blurb = row
            brand, _ = Brand.objects.update_or_create(
                slug=slug, defaults={"name": name, "blurb": blurb}
            )
            result[name] = brand
        return result

    def _seed_promos(self):
        from datetime import timedelta

        from django.utils import timezone

        yesterday = timezone.now() - timedelta(days=1)
        for code, percent_off, description in PROMO_CODES:
            PromoCode.objects.update_or_create(
                code=code,
                defaults={
                    "percent_off": percent_off,
                    "description": description,
                    "active": True,
                    # Only the deliberately retired code carries an expiry.
                    "valid_until": yesterday if code in EXPIRED_CODES else None,
                },
            )

    def _seed_products(self, categories, brands):
        from decimal import Decimal

        created = updated = 0
        for row in PRODUCTS:
            data = dict(zip(PRODUCT_COLUMNS, row))
            category_slug = data["category"]
            brand_name = data["brand"]

            defaults = {
                "name": data["name"],
                "brand": brands[brand_name],
                "category": categories[category_slug],
                "price": Decimal(data["price"]),
                "compare_at_price": (
                    Decimal(data["compare_at"]) if data["compare_at"] else None
                ),
                "short_description": data["short_description"],
                "description": data["description"],
                "specs": data["specs"],
                "image": CATEGORY_IMAGES.get(category_slug, ""),
                "stock": data["stock"],
                "rating": Decimal(data["rating"]),
                "rating_count": data["rating_count"],
                "is_featured": data["featured"],
                "is_active": True,
            }

            _, was_created = Product.objects.update_or_create(
                sku=data["sku"], defaults=defaults
            )
            if was_created:
                created += 1
            else:
                updated += 1

        return created, updated