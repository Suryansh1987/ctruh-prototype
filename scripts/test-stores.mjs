import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env
const envVars = readFileSync(resolve(process.cwd(), ".env"), "utf-8")
  .split("\n")
  .filter(l => l.trim() && !l.startsWith("#"))
  .reduce((acc, line) => {
    const idx = line.indexOf("=");
    if (idx === -1) return acc;
    acc[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    return acc;
  }, {});

const FIRECRAWL_KEY = envVars.FIRECRAWL_API_KEY;

const STORES = [
  // Fashion & Apparel
  "https://www.gymshark.com",
  "https://www.fashionnova.com",
  "https://www.rothys.com",
  "https://www.allbirds.com",
  "https://www.kithnyc.com",
  // Jewellery & Accessories
  "https://www.puravidabracelets.com",
  "https://www.mejuri.com",
  "https://www.studs.com",
  "https://www.gorjana.com",
  "https://www.catbirdnyc.com",
  // Beauty
  "https://www.glossier.com",
  "https://www.kyliecosmetics.com",
  "https://www.tatcha.com",
  "https://www.herbivore.com",
  "https://www.necessaire.com",
  // Home & Furniture
  "https://www.ruggable.com",
  "https://www.burrow.com",
  "https://www.ferm-living.com",
  "https://www.parachutehome.com",
  // Watches & Eyewear
  "https://www.mvmtwatches.com",
  "https://www.diff.com",
  "https://www.calieyewear.com",
  // Bags
  "https://www.dagnedover.com",
  "https://www.brevite.co",
  "https://www.herschel.com",
  // Fitness & Outdoors
  "https://www.tentree.com",
  "https://www.bombas.com",
  "https://www.cdlp.com",
  // High Ticket
  "https://www.dbjourney.com",
];

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/html, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

async function tryProductsJson(origin) {
  for (const path of ["/products.json?limit=5", "/collections/all/products.json?limit=5"]) {
    try {
      const r = await fetch(origin + path, { headers: HEADERS, redirect: "follow", signal: AbortSignal.timeout(8000) });
      const ct = r.headers.get("content-type") ?? "";
      if (r.ok && ct.includes("json")) {
        const d = await r.json();
        if (Array.isArray(d?.products) && d.products.length > 0)
          return { method: "products.json", count: d.products.length };
      }
    } catch { /* next */ }
  }
  return null;
}

async function trySitemap(origin) {
  try {
    const sm = await fetch(`${origin}/sitemap.xml`, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
    if (!sm.ok) return null;
    const xml = await sm.text();
    const nested = xml.match(/<loc>([^<]*sitemap_products[^<]*)<\/loc>/);
    let productXml = xml;
    if (nested) {
      const nr = await fetch(nested[1], { headers: HEADERS, signal: AbortSignal.timeout(8000) });
      if (nr.ok) productXml = await nr.text();
    }
    const locs = [...productXml.matchAll(/<loc>([^<]*)\/products\/([^<]+)<\/loc>/g)];
    if (locs.length === 0) return null;
    const testUrl = locs[0][0].replace(/<\/?loc>/g, "").trim() + ".json";
    const tr = await fetch(testUrl, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
    if (tr.ok && (tr.headers.get("content-type") ?? "").includes("json")) {
      const d = await tr.json();
      if (d?.product?.title) return { method: "sitemap", count: locs.length };
    }
    return { method: "sitemap (json blocked)", count: locs.length };
  } catch { return null; }
}

async function tryJsonLd(origin) {
  try {
    const r = await fetch(`${origin}/collections/all`, { headers: { ...HEADERS, Accept: "text/html" }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const html = await r.text();
    const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
      .map(m => { try { return JSON.parse(m[1]); } catch { return null; } }).filter(Boolean);
    const products = blocks.flatMap(b => {
      const items = b["@graph"] ?? (Array.isArray(b) ? b : [b]);
      return items.filter(i => i["@type"] === "Product" && i.name);
    });
    return products.length > 0 ? { method: "json-ld", count: products.length } : null;
  } catch { return null; }
}

async function tryFirecrawl(origin) {
  if (!FIRECRAWL_KEY) return null;
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIRECRAWL_KEY}`,
      },
      body: JSON.stringify({
        urls: [`${origin}/collections/all`],
        prompt: "Extract up to 10 ecommerce products. For each: title, price (number), description, imageUrl, productType.",
        schema: {
          type: "object",
          properties: {
            products: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  price: { type: "number" },
                  description: { type: "string" },
                  imageUrl: { type: "string" },
                  productType: { type: "string" },
                },
                required: ["title"],
              },
            },
          },
          required: ["products"],
        },
      }),
      signal: AbortSignal.timeout(60000),
    });
    const data = await res.json();
    // May be async — poll if needed
    if (data.success && Array.isArray(data.data?.products) && data.data.products.length > 0) {
      return { method: "firecrawl", count: data.data.products.length };
    }
    // Handle async job
    if (data.id) {
      for (let i = 0; i < 8; i++) {
        await new Promise(r => setTimeout(r, 4000));
        const poll = await fetch(`https://api.firecrawl.dev/v1/extract/${data.id}`, {
          headers: { Authorization: `Bearer ${FIRECRAWL_KEY}` },
        });
        const pd = await poll.json();
        if (pd.status === "completed" && Array.isArray(pd.data?.products) && pd.data.products.length > 0) {
          return { method: "firecrawl", count: pd.data.products.length };
        }
        if (pd.status === "failed") break;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function checkStore(origin) {
  return (
    await tryProductsJson(origin) ||
    await trySitemap(origin) ||
    await tryJsonLd(origin) ||
    await tryFirecrawl(origin) ||
    { method: "blocked", count: 0 }
  );
}

const results = [];
console.log("Testing 29 stores (native methods fast, Firecrawl for blocked ones ~30s each)...\n");

for (let i = 0; i < STORES.length; i += 5) {
  const batch = STORES.slice(i, i + 5);
  const batchResults = await Promise.all(batch.map(async (url) => {
    const r = await checkStore(url);
    return { url, ...r };
  }));
  results.push(...batchResults);
  batchResults.forEach(r => {
    const icon = r.method === "blocked" ? "✗" : "✓";
    const methodPad = r.method.padEnd(24);
    console.log(`${icon} ${r.url.replace("https://www.", "").padEnd(28)} [${methodPad}] ${r.count > 0 ? r.count + " products" : ""}`);
  });
}

const working = results.filter(r => r.method !== "blocked");
const blocked = results.filter(r => r.method === "blocked");
const byMethod = results.reduce((acc, r) => { acc[r.method] = (acc[r.method] || 0) + 1; return acc; }, {});

console.log(`\n━━━ Summary ━━━`);
console.log(`✓ Working : ${working.length}/${results.length} (${Math.round(working.length/results.length*100)}%)`);
console.log(`✗ Blocked : ${blocked.length}/${results.length}`);
console.log(`\nBy method:`);
Object.entries(byMethod).forEach(([m, c]) => console.log(`  ${m.padEnd(28)} ${c}`));
if (blocked.length > 0) {
  console.log(`\nStill blocked:`);
  blocked.forEach(r => console.log(`  - ${r.url}`));
}
