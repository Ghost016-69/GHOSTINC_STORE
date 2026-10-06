Markdown# GHOSTINC_STORE — Free Full-Stack GitHub Pages Architecture Blueprint

## 1. Executive Summary & Strategy

The existing **GHOSTINC_STORE** architecture relies on a static HTML/JS front end paired with a local Django + DRF + SQLite back end (`Back-end/`). To transition this application into a **scalable, production-grade full-stack website hosted on GitHub Pages for free**, we decouple the system into two distinct, zero-cost operational tiers:

1. **Frontend (GitHub Pages Hosting):** Compile the store interface into optimized static assets (HTML/JS/CSS) served globally via GitHub Pages CDN.
2. **Backend (Serverless BaaS / Edge Functions):** Migrate core server dependencies (Database, Auth, Row-Level Security, Cart Pricing, Order Processing) to a free-tier Serverless backend (e.g., **Supabase** or **Firebase + Cloudflare Workers**).

---

## 2. Decoupled Architecture Overview

                      ┌─────────────────────────────────────────┐
                      │             GitHub Pages CDN            │
                      │   (Vite + React / Static Web Assets)    │
                      └───────────────────┬─────────────────────┘
                                          │
                               HTTPS / REST & Realtime
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
     ┌─────────────────────────┐                     ┌─────────────────────────┐
     │     Supabase / BaaS     │                     │   Cloudflare Workers    │
     │  (PostgreSQL + RLS Auth)│                     │  (Serverless Edge APIs) │
     └─────────────────────────┘                     └─────────────────────────┘

---

## 3. Step-by-Step Implementation Guide

### Step 1: Configure Environment & Cline (.clinerules)

Create a `.clinerules` file in the root directory to direct Cline (VS Code AI agent) during automated scaffolding:

```markdown
# .clinerules
- Tech Stack: React + Vite + TypeScript + Tailwind CSS
- Backend Target: Supabase (PostgreSQL with RLS Enabled)
- Deployment Target: GitHub Pages (`dist/` static output)
- Rules:
  - Do not use server-dependent Node.js runtime code in frontend builds.
  - Money calculations MUST be computed in integer cents (e.g., ZAR cents) to match `PROJECT_CONTEXT.md`.
  - All public database mutations must be strictly governed by Row Level Security (RLS) policies.
Step 2: Database Migration Script (Supabase SQL)Create a SQL migration file at supabase/migrations/001_ecommerce_schema.sql to replicate the Django models (Product, Category, Brand, Order, OrderItem) in PostgreSQL with full RLS security:   SQL-- Enable Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories Table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL
);

-- Brands Table
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL
);

-- Products Table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  brand_id UUID REFERENCES public.brands(id),
  price_cents INT NOT NULL, -- Stored in integer cents (e.g. 249900 = R2499.00)
  stock INT NOT NULL DEFAULT 0,
  in_stock BOOLEAN GENERATED ALWAYS AS (stock > 0) STORED,
  description TEXT,
  image_path TEXT,
  rating NUMERIC(3,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders Table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  subtotal_cents INT NOT NULL,
  discount_cents INT DEFAULT 0,
  shipping_cents INT DEFAULT 9900,
  vat_cents INT NOT NULL,
  total_cents INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items Table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity INT NOT NULL,
  unit_price_cents INT NOT NULL
);

-- Promo Codes Table
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  percent_off INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  valid_until TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public categories read access" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public brands read access" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Public products read access" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public promo codes read access" ON public.promo_codes FOR SELECT USING (is_active = true);
CREATE POLICY "Public order creation" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public order items creation" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Order lookup by order_number" ON public.orders FOR SELECT USING (true);

-- Indexes for Scalable Queries
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_brand ON public.products(brand_id);
CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_orders_number ON public.orders(order_number);
Step 3: Relative Path & Routing Configuration for GitHub PagesGitHub Pages serves applications from subpaths (e.g., https://username.github.io/GHOSTINC_STORE/). Update vite.config.ts and set up hash/basename routing to ensure assets load properly without 404 errors:TypeScript// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/GHOSTINC_STORE/' : '/',
  build: {
    outDir: 'dist',
  },
});
Step 4: GitHub Actions Deployment Pipeline (.github/workflows/deploy.yml)Automate static site compilation and deployment to GitHub Pages on every push to main:YAMLname: Deploy GHOSTINC_STORE to GitHub Pages

on:
  push:
    branches: ["main"]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Build Static Production Bundle
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

      - name: Upload GitHub Pages Artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
4. Money & Pricing Formula PreservationPer section 5 of PROJECT_CONTEXT.md, the pricing logic must be executed in integer cents to eliminate floating-point precision issues[cite: 1].   TypeScript// src/utils/pricing.ts

export interface CartItem {
  price_cents: number;
  quantity: number;
}

export interface Quote {
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  vat_cents: number;
  total_cents: number;
}

export function calculateCartQuote(items: CartItem[], discountPercent: number = 0): Quote {
  const subtotal_cents = items.reduce((acc, item) => acc + item.price_cents * item.quantity, 0);
  
  // Promo Discount Calculation (Half-Up Rounding)
  const discount_cents = discountPercent > 0 
    ? Math.round((subtotal_cents * discountPercent) / 100) 
    : 0;
  
  const discounted_subtotal = subtotal_cents - discount_cents;

  // Free Shipping Threshold: R2500.00 (250000 cents)
  let shipping_cents = 0;
  if (items.length > 0 && discounted_subtotal < 250000) {
    shipping_cents = 9900; // Flat R99.00
  }

  const taxable_cents = discounted_subtotal + shipping_cents;
  const vat_cents = Math.round(taxable_cents * 0.15); // 15% VAT
  const total_cents = taxable_cents + vat_cents;

  return {
    subtotal_cents,
    discount_cents,
    shipping_cents,
    vat_cents,
    total_cents,
  };
}
5. Free-Tier Scalability ComparisonOperational AreaFree-Tier SolutionLimits & Free CapacityStatic Web HostingGitHub PagesUnlimited bandwidth, 100 GB soft monthly limitDatabase & AuthSupabase Free Tier500 MB Postgres DB, 50,000 monthly active usersServerless FunctionsCloudflare Workers100,000 requests per dayCDN & SSLGitHub / CloudflareGlobal CDN, automatic free SSL certificates
---

Once created, you can tell Cline to read `FULLSTACK_GITHUB_PAGES_ARCHITECTURE.md` directly!

<FollowUp label="Would you like a terminal command to auto-generate this fi