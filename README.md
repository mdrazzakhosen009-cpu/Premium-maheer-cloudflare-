# MAHEER STORE — Cloudflare Workers + Turso (NO R2)

This is the clean Cloudflare-only build of MAHEER STORE. It keeps the premium storefront and separate admin panel, removes Render/R2-specific configuration, and keeps Turso as the persistent database.

## Kept features
- Premium responsive MAHEER STORE storefront
- Bangla + English toggle
- Search, sorting and category filters
- Product details, quantity and variant UI
- Cart, Order Now / Buy Now and checkout
- Cash on Delivery + advance/bKash structure UI
- Order number + Track Order
- Reviews + product reviews + horizontal auto-slider
- MAHEER Assistant with local product-aware fallback + optional Gemini
- Chat order flow: product → quantity → name → phone → address → order number
- Separate `/admin/` panel
- Admin dashboard, products, orders and store settings
- Admin product CRUD, stock, featured flag and How to Use
- **Product image upload from Admin → Products**
- Uploaded images are stored in the Turso `image_assets` table and served from `/api/images/:id`
- No Cloudflare R2 binding
- No Render configuration
- No duplicate root admin folder

## Project structure
```text
maheer-store/
├── public/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── assets/
│   └── admin/
│       ├── index.html
│       ├── admin.css
│       └── admin.js
├── worker.js
├── wrangler.jsonc
├── package.json
├── schema.sql
└── README.md
```

## 1. Install
```bash
npm install
```

## 2. Set Cloudflare secrets
```bash
npx wrangler secret put TURSO_DATABASE_URL
npx wrangler secret put TURSO_AUTH_TOKEN
npx wrangler secret put ADMIN_PASSWORD
```

Optional Gemini:
```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put GEMINI_MODEL
```

`TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are the recommended Cloudflare Worker secrets. The Worker also accepts `TURSO_URL` and `TURSO_TOKEN` as aliases. Keep the auth token private and never put it in `public/` files.

## 3. Initialize the Turso database
Run the SQL in `schema.sql` once against your existing Turso database. The Worker also performs safe `CREATE TABLE IF NOT EXISTS` initialization on startup.

## 4. Deploy ONLY to Cloudflare
```bash
npx wrangler deploy
```

The Worker serves the storefront and admin UI from `public/`, while `/api/*` is handled by the Worker. Cloudflare Workers Static Assets is used for the website files.

## Admin
Open:
```text
/admin/
```

Use the password stored in the Cloudflare `ADMIN_PASSWORD` secret.

## Product image upload
Admin → Products → Add Product/Edit Product → Upload Image.

Accepted: JPG, PNG, WEBP, GIF, AVIF. Maximum: 4MB.

The image is converted to base64 and stored in the Turso `image_assets` table. The website reads it through `/api/images/:id`, so the upload does not depend on a temporary server filesystem or R2.

## Important
This build intentionally has **no** `render.yaml`, `server.js`, R2 bucket binding, or duplicate root `admin/` directory. The production deployment target is Cloudflare Workers + Turso.


### Admin password
The Admin panel includes a dedicated **Admin Password** section in the sidebar. The current password is validated, the new password must be at least 8 characters, and the password hash is stored in the Turso `settings` table. After a successful change, the current session is invalidated and the admin must log in again with the new password.
