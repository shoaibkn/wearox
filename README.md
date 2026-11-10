# WEAROX Shopify Storefront Theme

Shopify Online Store 2.0 theme for **WEAROX** (Gen-Z designer streetwear & technical footwear), customized on top of Shopify’s Ritual v4.4.0 / Horizon Theme Blocks architecture.

## Included Customizations & Features

- **WEAROX Brand Identity:** Custom palette (`#ffffff`, `#0a0a0a`, `#e03c22`, `#141414`, `#ebebea`), uppercase display typography, geometric SVG wordmark fallback (`assets/wearox-logo.svg`), SVG favicon (`assets/wearox-favicon.svg`), top announcement bar (`sections/header-group.json`), and branded copy across all storefront templates.
- **Cart Drawer CRO:**
  - **Free Shipping Progress Bar** (`snippets/cart-free-shipping.liquid`): Semantic `<progress>` bar tracking against `settings.free_shipping_threshold` in both the slide-out drawer and `/cart` page.
  - **Cart Cross-Sell Upsells** (`snippets/cart-upsells.liquid`, `assets/cart-upsells.js`): Horizontal upsell cards with variant `<select>` and instant AJAX add-to-cart.
- **Product Page (`templates/product.json`):**
  - **Size & Fit Guide Modal** (`blocks/size-guide.liquid`, `assets/size-guide.js`): Native `<dialog>` with auto-selected category tabs (`Tees & Hoodies`, `Cargos & Pants`, `Footwear (EU)`), sticky-header responsive measurement tables, and optional `product.metafields.custom.size_guide` overrides.
  - **USP Trust Strip** (`blocks/usp-strip.liquid`) and live **Low-Stock Indicator** (`blocks/product-inventory.liquid`).
- **Discovery & Lookbook:**
  - **Recently Viewed Products Section** (`sections/recently-viewed.liquid`, `assets/recently-viewed-section.js`) powered by `localStorage` and Shopify’s Section Rendering API.
  - Pre-configured **`templates/page.about.json`** and shoppable **`templates/page.lookbook.json`** templates.
- **Test Catalog Seed (`seed/wearox-test-products.csv`):** Ready-to-import Shopify Product CSV with 8 WEAROX products (shoes, boxy tees, 520GSM hoodies, cargos, cap) across 66 variants.

## Local Development

1. Install Shopify CLI:
   ```bash
   npm install -g @shopify/cli@latest
   ```
2. Set your Shopify store domain in `shopify.theme.toml`:
   ```toml
   [environments.dev]
   store = "your-store-name.myshopify.com"
   ```
3. Start the local hot-reloading preview server (`http://127.0.0.1:9292`):
   ```bash
   shopify theme dev -e dev
   ```
4. Import test products via **Shopify Admin → Products → Import** using `seed/wearox-test-products.csv`.

## Validation Before Deploying

```bash
# Lint Liquid, JSON schemas, and Shopify best practices
shopify theme check

# Type-check all theme scripts against assets/jsconfig.json
npx -p typescript tsc --noEmit -p assets/jsconfig.json
```

## Git / PR Workflow

- `origin`: `https://github.com/shoaibkn/wearox.git`
- `upstream`: `https://github.com/lumin8-labs/wearox.git`
- Always run `shopify theme pull` before pushing if changes were made online in Shopify’s Theme Editor.
