const origin = process.argv[2] || "https://www.mvmt.com";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/html, */*",
  "Accept-Language": "en-US,en;q=0.9",
};

async function tryUrl(url) {
  try {
    const res = await fetch(url, { headers: HEADERS, redirect: "follow" });
    const ct = res.headers.get("content-type") ?? "";
    console.log(`  ${res.status} ${ct.slice(0, 40).padEnd(40)} ${url}`);
    return { status: res.status, ct, res };
  } catch (e) {
    console.log(`  ERR  ${e.message.slice(0, 40).padEnd(40)} ${url}`);
    return null;
  }
}

console.log("\n=== products.json candidates ===");
for (const path of [
  "/products.json?limit=5",
  "/collections/all/products.json?limit=5",
]) {
  const r = await tryUrl(origin + path);
  if (r?.status === 200 && r.ct.includes("json")) {
    const data = await r.res.json();
    console.log(`  → ${data?.products?.length ?? 0} products`);
  }
}

console.log("\n=== sitemap ===");
const smRes = await fetch(`${origin}/sitemap.xml`, { headers: HEADERS });
console.log(`  ${smRes.status} ${smRes.headers.get("content-type")?.slice(0, 40)}`);

if (smRes.ok) {
  const xml = await smRes.text();
  // check for nested product sitemap
  const nested = xml.match(/<loc>([^<]*sitemap_products[^<]*)<\/loc>/);
  console.log(`  Nested sitemap_products: ${nested ? nested[1] : "none"}`);

  // count product locs in main sitemap
  const mainLocs = [...xml.matchAll(/<loc>([^<]*)\/products\/([^<]+)<\/loc>/g)];
  console.log(`  Product locs in main sitemap: ${mainLocs.length}`);
  if (mainLocs.length > 0) console.log(`  Sample: ${mainLocs[0][0].replace(/<\/?loc>/g,"").trim()}`);

  if (nested) {
    const nr = await fetch(nested[1], { headers: HEADERS });
    const nxml = await nr.text();
    const nlocs = [...nxml.matchAll(/<loc>([^<]*)\/products\/([^<]+)<\/loc>/g)];
    console.log(`  Product locs in nested sitemap: ${nlocs.length}`);
    if (nlocs.length > 0) {
      const sample = nlocs[0][0].replace(/<\/?loc>/g,"").trim();
      console.log(`  Sample: ${sample}`);
      // test .json fetch
      const jsonRes = await fetch(sample + ".json", { headers: HEADERS });
      const jct = jsonRes.headers.get("content-type") ?? "";
      console.log(`  .json fetch: ${jsonRes.status} ${jct.slice(0,40)}`);
      if (jsonRes.ok && jct.includes("json")) {
        const d = await jsonRes.json();
        console.log(`  Product title: ${d?.product?.title}`);
      }
    }
  }
}

console.log("\n=== /collections/all HTML fallback ===");
const colRes = await fetch(`${origin}/collections/all`, { headers: { ...HEADERS, Accept: "text/html" } });
console.log(`  ${colRes.status} ${colRes.headers.get("content-type")?.slice(0,40)}`);
if (colRes.ok) {
  const html = await colRes.text();
  const handles = [...html.matchAll(/href="\/products\/([^"?#]+)"/g)].map(m => m[1]);
  const unique = [...new Set(handles)];
  console.log(`  Product handles found: ${unique.length}`);
  if (unique.length > 0) {
    console.log(`  Sample: ${unique.slice(0,3).join(", ")}`);
    const testUrl = `${origin}/products/${unique[0]}.json`;
    const tr = await fetch(testUrl, { headers: HEADERS });
    const tct = tr.headers.get("content-type") ?? "";
    console.log(`  .json fetch test: ${tr.status} ${tct.slice(0,40)}`);
  }
}
