import { createClient } from '@libsql/client/web';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

const seedProducts = [
  ['Radiance Glow Serum','Serum','1490','https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=85','Brightening serum with a lightweight finish.','Apply 2–3 drops to clean, dry skin. Use once or twice daily and follow with moisturizer.'],
  ['Velvet Matte Lip Color','Lip Care','890','https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=900&q=85','Long-wear velvet color for everyday glam.','Apply directly to lips. Reapply after meals when needed.'],
  ['Hydra Balance Moisturizer','Skin Care','1190','https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=85','Daily hydration with a soft, non-greasy feel.','Use a small amount on clean face and neck morning and night.'],
  ['Silk Repair Hair Serum','Hair Care','990','https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&w=900&q=85','Smooth, glossy finish for dry-looking hair.','Rub 1–2 pumps between palms and apply to mid-lengths and ends.'],
  ['Vitamin E Body Lotion','Body Care','850','https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85','Comforting moisture for soft skin.','Apply generously to clean body skin, especially after showering.'],
  ['Daily Shield SPF 50+','Sunscreen','1290','https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=85','Broad-spectrum daily sun protection.','Apply generously as the last skincare step 15 minutes before sun exposure. Reapply regularly.'],
  ['Onion Hair Oil','Hair Care','720','https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=85','Nourishing scalp and hair oil blend.','Massage into scalp and hair, leave for 30–60 minutes or overnight, then shampoo.'],
  ['Argan Luxe Hair Oil','Hair Care','1100','https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=900&q=85','Argan-inspired shine and softness treatment.','Use a few drops on damp or dry hair, focusing on lengths and ends.'],
  ['Calm Cleansing Foam','Cleanser','790','https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=85','Gentle cleanser for a fresh daily routine.','Wet face, massage a small amount gently for 30–60 seconds, then rinse.'],
  ['Overnight Repair Cream','Skin Care','1390','https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=900&q=85','Rich night cream for a rested look.','Apply a thin layer as the final step of your night routine.'],
  ['Rose Mist Toner','Skin Care','690','https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=900&q=85','Refreshing facial mist for your routine.','Mist over clean skin and gently pat in. Use whenever skin needs refreshment.'],
  ['Premium Beauty Gift Set','Gift Set','2990','https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=900&q=85','Curated essentials for a complete beauty ritual.','Follow the individual instructions shown for each product in the set.']
];

const defaultSettings = {
  about: 'MAHEER STORE brings curated beauty and personal-care essentials together with a premium, simple shopping experience. We focus on authentic products, clear information and responsive customer support.',
  phone: '+880 1988-050183',
  whatsapp: '8801988050183',
  facebook: '#',
  instagram: '#',
  tiktok: '#',
  youtube: '#',
  email: 'hello@maheershop.com'
};

let initPromise = null;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers }
  });
}

function securityHeaders(headers = {}) {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...headers
  };
}

function getDb(env) {
  if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) return null;
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

async function sql(db, statement, args = []) {
  return db.execute({ sql: statement, args });
}

async function initDb(env) {
  const db = getDb(env);
  if (!db) return false;
  await db.batch([
    { sql: 'CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,category TEXT,price REAL,image TEXT,description TEXT,usage TEXT DEFAULT \'\',rating REAL DEFAULT 4.8,reviews INTEGER DEFAULT 0,stock INTEGER DEFAULT 25,featured INTEGER DEFAULT 1,created_at TEXT DEFAULT CURRENT_TIMESTAMP)', args: [] },
    { sql: 'CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY AUTOINCREMENT,order_no TEXT UNIQUE,name TEXT,phone TEXT,address TEXT,payment TEXT,items TEXT,total REAL,status TEXT DEFAULT \'Pending\',created_at TEXT DEFAULT CURRENT_TIMESTAMP)', args: [] },
    { sql: 'CREATE TABLE IF NOT EXISTS reviews(id INTEGER PRIMARY KEY AUTOINCREMENT,product_id INTEGER,name TEXT,rating INTEGER,comment TEXT,approved INTEGER DEFAULT 1,created_at TEXT DEFAULT CURRENT_TIMESTAMP)', args: [] },
    { sql: 'CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT)', args: [] },
    { sql: 'CREATE TABLE IF NOT EXISTS image_assets(id INTEGER PRIMARY KEY AUTOINCREMENT,mime TEXT NOT NULL,data TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP)', args: [] }
  ], 'write');
  try { await sql(db, "ALTER TABLE products ADD COLUMN usage TEXT DEFAULT ''"); } catch (_) {}
  const count = await sql(db, 'SELECT COUNT(*) AS c FROM products');
  if (Number(count.rows[0]?.c || 0) === 0) {
    for (const p of seedProducts) {
      await sql(db, 'INSERT INTO products(name,category,price,image,description,usage,rating,reviews,stock,featured) VALUES(?,?,?,?,?,?,?,?,?,?)', [...p, 4.8, Math.floor(Math.random() * 80) + 12, 25, 1]);
    }
  }
  for (const [k, v] of Object.entries(defaultSettings)) {
    await sql(db, 'INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)', [k, v]);
  }
  return true;
}

async function ensureDb(env) {
  if (!initPromise) initPromise = initDb(env).catch((err) => { initPromise = null; throw err; });
  return initPromise;
}

function localProducts() {
  return seedProducts.map((p, i) => ({ id: i + 1, name: p[0], category: p[1], price: Number(p[2]), image: p[3], description: p[4], usage: p[5], rating: 4.8, reviews: 30 + i * 7, stock: 25, featured: 1 }));
}

function base64FromBytes(bytes) {
  let out = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(out);
}

function bytesFromBase64(data) {
  const raw = atob(String(data));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function base64UrlEncode(value) {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return atob(padded);
}

async function sign(secret, data) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(sig)));
}

async function makeToken(secret) {
  const payload = base64UrlEncode(JSON.stringify({ exp: Date.now() + SESSION_TTL_MS }));
  const sig = await sign(secret, payload);
  return payload + '.' + sig;
}

async function validToken(secret, token) {
  if (!secret || !token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  try {
    const parsed = JSON.parse(base64UrlDecode(payload));
    if (!parsed.exp || Number(parsed.exp) < Date.now()) return false;
    const expected = await sign(secret, payload);
    return expected === sig;
  } catch (_) { return false; }
}

async function requireAdmin(request, env) {
  const secret = env.ADMIN_PASSWORD || 'admin123';
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  return validToken(secret, token);
}

function orderNo() {
  return 'MH' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 90 + 10);
}

function imageIdFromUrl(url) {
  const m = String(url || '').match(/^\/api\/images\/(\d+)$/);
  return m ? Number(m[1]) : null;
}

async function catalog(env) {
  const db = getDb(env);
  if (!db) return localProducts();
  const r = await sql(db, 'SELECT name,price,category,usage,stock,rating,reviews,id,image,description FROM products ORDER BY featured DESC,id DESC');
  return r.rows;
}

function findProduct(message, products) {
  const low = String(message || '').toLowerCase();
  let p = products.find(x => low.includes(String(x.name || '').toLowerCase()));
  if (p) return p;
  p = products.find(x => low.includes(String(x.name || '').toLowerCase().split(' ')[0]));
  if (p) return p;
  const cats = ['cleanser','serum','sunscreen','body care','lip care','hair care','skin care','gift set'];
  const cat = cats.find(c => low.includes(c));
  return cat ? products.find(x => String(x.category || '').toLowerCase() === cat) : null;
}

async function chatReply(body, env) {
  const msg = String(body.message || '').trim();
  if (!msg) return { reply: 'Hi! I’m MAHEER Assistant. Ask me about products, price, delivery, ordering or order tracking.' };
  const products = await catalog(env);
  const low = msg.toLowerCase();
  const selected = body.contextProduct || findProduct(msg, products);

  if (env.GEMINI_API_KEY && !/\border\b|অর্ডার|কিনতে|buy/i.test(msg)) {
    try {
      const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
      const compact = products.slice(0, 50).map(p => `${p.name} | ৳${p.price} | ${p.category} | stock ${p.stock} | rating ${p.rating} (${p.reviews}) | ${p.usage || ''}`).join('\n');
      const context = 'You are MAHEER Store Assistant for a Bangladesh beauty and personal-care ecommerce store. Reply concisely in the requested language. Use only the supplied catalog facts. Never invent stock, price or policy details.\nCatalog:\n' + compact + '\nCurrent product context: ' + JSON.stringify(selected || null);
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: context + '\nCustomer: ' + msg }] }] })
      });
      const j = await r.json();
      const reply = j.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) return { reply, provider: 'gemini', product: selected || undefined };
    } catch (_) {}
  }

  if (/^(hello|hi|assalam|হাই|হ্যালো)/.test(low)) return { reply: 'Welcome to MAHEER STORE ✨ Skin Care, Serum, Sunscreen, Body Care ও Lip Care নিয়ে আমাকে জিজ্ঞেস করতে পারেন।' };
  if (/track|ট্র্যাক|order status|অর্ডার.*স্ট্যাটাস/.test(low)) {
    const no = msg.match(/MH\d+/i)?.[0];
    return { reply: no ? `Track Order page-এ ${no} দিয়ে status দেখুন।` : 'আপনার MH দিয়ে শুরু হওয়া order number দিন, যেমন MH1234567890।' };
  }
  if (/\border\b|অর্ডার|কিনতে|buy/.test(low)) {
    const qtyMatch = msg.match(/(?:x|×|qty|quantity|জন|টা)\s*(\d+)/i);
    const qty = Math.max(1, Math.min(20, Number(qtyMatch?.[1] || 1)));
    return selected
      ? { reply: `${selected.name} × ${qty} order নেওয়া যাবে। আপনার নাম দিন।`, orderStart: true, product: selected, qty }
      : { reply: 'কোন productটি কিনতে চান? Product name লিখুন।' };
  }
  if (/price|দাম|cost|কত/.test(low)) {
    return selected ? { reply: `${selected.name} এর দাম ৳${Number(selected.price).toLocaleString('en-BD')}. Rating ${selected.rating}★ (${selected.reviews} reviews)।`, product: selected } : { reply: 'কোন product-এর দাম জানতে চান? Product name লিখুন।' };
  }
  if (/use|ব্যবহার|কিভাবে|how/.test(low)) {
    return selected ? { reply: `${selected.name}: ${selected.usage || 'Product details-এর How to Use section দেখুন।'}`, product: selected } : { reply: 'Product name লিখে ব্যবহারবিধি জানতে চান।' };
  }
  if (/stock|available|আছে|স্টক/.test(low)) {
    return selected ? { reply: `${selected.name}: ${Number(selected.stock || 0) > 0 ? 'Stock available' : 'Out of stock'}।`, product: selected } : { reply: 'কোন product-এর stock জানতে চান?' };
  }
  if (/delivery|ডেলিভারি|shipping/.test(low)) return { reply: 'MAHEER STORE Bangladesh-wide delivery support করে। Checkout-এ ঠিকানা দিয়ে order confirm করুন।' };
  return selected
    ? { reply: `${selected.name} — ৳${Number(selected.price).toLocaleString('en-BD')}, ${selected.rating}★ rating, ${selected.reviews} reviews. ${selected.usage || ''}`, product: selected }
    : { reply: 'আমি product, price, usage, category, stock, order এবং delivery বিষয়ে সাহায্য করতে পারি।' };
}

async function handleApi(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    if (method === 'POST' && path === '/api/admin/login') {
      const body = await request.json();
      const secret = env.ADMIN_PASSWORD || 'admin123';
      if (String(body.password || '') !== secret) return json({ error: 'Wrong password' }, 401);
      return json({ token: await makeToken(secret) });
    }

    if (env.TURSO_DATABASE_URL && env.TURSO_AUTH_TOKEN) await ensureDb(env);

    if (method === 'GET' && path === '/api/products') {
      const db = getDb(env);
      const q = (url.searchParams.get('q') || '').trim();
      const cat = url.searchParams.get('category') || 'all';
      const sort = url.searchParams.get('sort') || 'default';
      if (!db) {
        let rows = localProducts();
        if (q) rows = rows.filter(x => (x.name + ' ' + x.category).toLowerCase().includes(q.toLowerCase()));
        if (cat !== 'all') rows = rows.filter(x => x.category === cat);
        if (sort === 'low') rows.sort((a,b) => a.price - b.price);
        else if (sort === 'high') rows.sort((a,b) => b.price - a.price);
        else if (sort === 'rating') rows.sort((a,b) => b.rating - a.rating);
        return json(rows);
      }
      let sqlText = 'SELECT * FROM products WHERE 1=1';
      const args = [];
      if (q) { sqlText += ' AND (name LIKE ? OR category LIKE ?)'; args.push(`%${q}%`, `%${q}%`); }
      if (cat !== 'all') { sqlText += ' AND category=?'; args.push(cat); }
      if (sort === 'low') sqlText += ' ORDER BY price ASC';
      else if (sort === 'high') sqlText += ' ORDER BY price DESC';
      else if (sort === 'rating') sqlText += ' ORDER BY rating DESC';
      else sqlText += ' ORDER BY featured DESC,id DESC';
      return json((await sql(db, sqlText, args)).rows);
    }

    if (method === 'GET' && /^\/api\/products\/\d+$/.test(path)) {
      const id = Number(path.split('/').pop());
      const db = getDb(env);
      if (!db) {
        const p = localProducts()[id - 1];
        if (!p) return json({ error: 'Not found' }, 404);
        return json({ ...p, reviewsList: [] });
      }
      const r = await sql(db, 'SELECT * FROM products WHERE id=?', [id]);
      const p = r.rows[0];
      if (!p) return json({ error: 'Not found' }, 404);
      const rr = await sql(db, 'SELECT * FROM reviews WHERE product_id=? AND approved=1 ORDER BY id DESC', [id]);
      return json({ ...p, reviewsList: rr.rows });
    }

    if (method === 'GET' && path === '/api/reviews') {
      const db = getDb(env);
      if (!db) return json([]);
      const r = await sql(db, 'SELECT r.id,r.product_id,r.name,r.rating,r.comment,r.created_at,p.name AS product_name FROM reviews r LEFT JOIN products p ON p.id=r.product_id WHERE r.approved=1 ORDER BY r.id DESC LIMIT 40');
      return json(r.rows);
    }

    if (method === 'GET' && path === '/api/settings') {
      const db = getDb(env);
      const s = { ...defaultSettings };
      if (db) {
        const r = await sql(db, 'SELECT key,value FROM settings');
        r.rows.forEach(x => { s[x.key] = x.value; });
      }
      return json(s);
    }

    if (method === 'GET' && /^\/api\/images\/\d+$/.test(path)) {
      const db = getDb(env);
      if (!db) return new Response('Not found', { status: 404 });
      const id = Number(path.split('/').pop());
      const r = await sql(db, 'SELECT mime,data FROM image_assets WHERE id=?', [id]);
      const row = r.rows[0];
      if (!row) return new Response('Not found', { status: 404 });
      return new Response(bytesFromBase64(row.data), { status: 200, headers: securityHeaders({ 'Content-Type': String(row.mime), 'Cache-Control': 'public,max-age=31536000,immutable' }) });
    }

    if (method === 'POST' && path === '/api/orders') {
      const body = await request.json();
      const { name, phone, address, payment = 'Cash on Delivery', items = [], total } = body;
      if (!name || !phone || !address || !Array.isArray(items) || !items.length) return json({ error: 'Missing order details' }, 400);
      const no = orderNo();
      const db = getDb(env);
      if (!db) return json({ error: 'Turso database is required to place orders.' }, 503);
      await sql(db, 'INSERT INTO orders(order_no,name,phone,address,payment,items,total) VALUES(?,?,?,?,?,?,?)', [no, String(name).slice(0,100), String(phone).slice(0,40), String(address).slice(0,1000), String(payment).slice(0,80), JSON.stringify(items), Number(total || 0)]);
      return json({ ok: true, orderNo: no });
    }

    if (method === 'GET' && /^\/api\/orders\/.+/.test(path)) {
      const no = decodeURIComponent(path.split('/').pop());
      const db = getDb(env);
      if (!db) return json({ error: 'Turso database is required to track orders.' }, 503);
      const r = await sql(db, 'SELECT * FROM orders WHERE order_no=?', [no]);
      if (!r.rows[0]) return json({ error: 'Order not found' }, 404);
      return json(r.rows[0]);
    }

    if (method === 'POST' && path === '/api/reviews') {
      const body = await request.json();
      const product_id = Number(body.product_id);
      const name = String(body.name || '').trim();
      const rating = Math.max(1, Math.min(5, Number(body.rating) || 5));
      const comment = String(body.comment || '').trim();
      if (!product_id || !name || !comment) return json({ error: 'Please complete the review.' }, 400);
      const db = getDb(env);
      if (!db) return json({ error: 'Turso database is required for reviews.' }, 503);
      await sql(db, 'INSERT INTO reviews(product_id,name,rating,comment) VALUES(?,?,?,?)', [product_id, name.slice(0,100), rating, comment.slice(0,1200)]);
      await sql(db, 'UPDATE products SET rating=(SELECT ROUND(AVG(rating),1) FROM reviews WHERE product_id=? AND approved=1),reviews=(SELECT COUNT(*) FROM reviews WHERE product_id=? AND approved=1) WHERE id=?', [product_id, product_id, product_id]);
      return json({ ok: true });
    }

    if (method === 'POST' && path === '/api/chat') return json(await chatReply(await request.json(), env));

    if (path.startsWith('/api/admin/')) {
      if (!(await requireAdmin(request, env))) return json({ error: 'Unauthorized' }, 401);
      const db = getDb(env);
      if (!db) return json({ error: 'Turso database is not configured.' }, 503);

      if (method === 'GET' && path === '/api/admin/products') return json((await sql(db, 'SELECT * FROM products ORDER BY id DESC')).rows);
      if (method === 'POST' && path === '/api/admin/products') {
        const p = await request.json();
        await sql(db, 'INSERT INTO products(name,category,price,image,description,usage,rating,reviews,stock,featured) VALUES(?,?,?,?,?,?,?,?,?,?)', [p.name, p.category, Number(p.price), p.image, p.description || '', p.usage || '', 4.8, 0, Number(p.stock || 0), p.featured ? 1 : 0]);
        return json({ ok: true });
      }
      if (method === 'PUT' && /^\/api\/admin\/products\/\d+$/.test(path)) {
        const id = Number(path.split('/').pop());
        const p = await request.json();
        await sql(db, 'UPDATE products SET name=?,category=?,price=?,image=?,description=?,usage=?,stock=?,featured=? WHERE id=?', [p.name, p.category, Number(p.price), p.image, p.description || '', p.usage || '', Number(p.stock || 0), p.featured ? 1 : 0, id]);
        return json({ ok: true });
      }
      if (method === 'DELETE' && /^\/api\/admin\/products\/\d+$/.test(path)) {
        const id = Number(path.split('/').pop());
        await sql(db, 'DELETE FROM products WHERE id=?', [id]);
        return json({ ok: true });
      }
      if (method === 'GET' && path === '/api/admin/orders') return json((await sql(db, 'SELECT * FROM orders ORDER BY id DESC')).rows);
      if (method === 'PUT' && /^\/api\/admin\/orders\/\d+$/.test(path)) {
        const id = Number(path.split('/').pop());
        await sql(db, 'UPDATE orders SET status=? WHERE id=?', [String((await request.json()).status || 'Pending'), id]);
        return json({ ok: true });
      }
      if (method === 'PUT' && path === '/api/admin/settings') {
        const body = await request.json();
        for (const [k, v] of Object.entries(body)) await sql(db, 'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [k, String(v)]);
        return json({ ok: true });
      }
      if (method === 'POST' && path === '/api/admin/upload') {
        const form = await request.formData();
        const file = form.get('image');
        if (!(file instanceof File)) return json({ error: 'No file' }, 400);
        if (!ALLOWED_IMAGES.has(file.type)) return json({ error: 'Unsupported image type' }, 400);
        if (file.size > MAX_IMAGE_BYTES) return json({ error: 'Image must be 4MB or smaller.' }, 413);
        const data = base64FromBytes(new Uint8Array(await file.arrayBuffer()));
        const r = await sql(db, 'INSERT INTO image_assets(mime,data) VALUES(?,?)', [file.type, data]);
        return json({ ok: true, url: '/api/images/' + String(r.lastInsertRowid) });
      }
    }

    return json({ error: 'API route not found' }, 404);
  } catch (err) {
    console.error(err);
    return json({ error: 'Server error' }, 500);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApi(request, env, ctx);
    if (url.pathname === '/admin' || url.pathname === '/admin/') {
      const assetUrl = new URL(request.url);
      assetUrl.pathname = '/admin/index.html';
      return env.ASSETS.fetch(assetUrl.toString());
    }
    return env.ASSETS.fetch(request);
  }
};
