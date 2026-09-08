# MAHEER STORE — Cloudflare Workers + D1 + R2

Premium ecommerce storefront with bilingual UI, MAHEER Assistant, COD ordering, order tracking, product reviews, admin management, responsive/no-zoom layout, full hero image, WhatsApp contact and Nexora Web footer branding.

## Project structure

```text
MAHEER-STORE/
├── worker.js
├── wrangler.jsonc
├── schema.sql
├── README.md
└── public/
    ├── index.html
    ├── style.css
    ├── app.js
    ├── assets/
    │   ├── hero.png
    │   ├── nexora.png
    │   ├── brand.png
    │   └── brand-circle.png
    └── admin/
        ├── index.html
        ├── admin.css
        └── admin.js
```

There is no Render configuration, Node/Turso server, or duplicate root `admin/` folder in this Cloudflare-only package.

## Cloudflare setup

### 1. Create the R2 bucket

```bash
npm install -g wrangler
wrangler login
wrangler r2 bucket create maheer-store-images
```

The bucket name must match `bucket_name` in `wrangler.jsonc`.

### 2. Create a D1 database

```bash
wrangler d1 create maheer-store-db
```

Copy the returned `database_id` into `wrangler.jsonc` as a D1 binding named `DB`, for example:

```jsonc
"d1_databases": [
  {"binding":"DB","database_name":"maheer-store-db","database_id":"YOUR_DATABASE_ID"}
]
```

### 3. Initialize D1

```bash
wrangler d1 execute maheer-store-db --remote --file=schema.sql
```

### 4. Set admin password

Add a Worker secret named `ADMIN_PASSWORD`:

```bash
wrangler secret put ADMIN_PASSWORD
```

Optional AI fallback:

```bash
wrangler secret put GEMINI_API_KEY
```

You can also set `GEMINI_MODEL` when needed.

### 5. Deploy

From the project root:

```bash
wrangler deploy
```

## R2 image uploads

Admin → Products → Upload Image sends the file to the R2 bucket through `/api/admin/upload`.

Accepted image types: JPG, PNG, WEBP, GIF, AVIF.

Maximum upload size: 8MB.

Uploaded images are stored under `products/` in R2 and served by the Worker through `/media/...`. Replacing or deleting a product image removes the previous MAHEER R2 object when applicable. Image URL entry is also supported.

## Admin panel

Open:

```text
https://YOUR-WORKER-DOMAIN/admin/
```

The admin API requires the `ADMIN_PASSWORD` secret. Keep that secret private.

## Local development

```bash
wrangler dev
```

For local D1/R2 development, configure the relevant Wrangler bindings and local resources as described in Cloudflare Wrangler documentation.
