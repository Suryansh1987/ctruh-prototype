import FirecrawlApp from "@mendable/firecrawl-js";
import type { NormalizedProduct } from "@/lib/types";

let _firecrawl: FirecrawlApp | null = null;
function getFirecrawl(): FirecrawlApp {
  if (!_firecrawl) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) throw new Error("FIRECRAWL_API_KEY not set");
    _firecrawl = new FirecrawlApp({ apiKey });
  }
  return _firecrawl;
}

const MAX_PRODUCTS = 10;

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/html, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

interface ShopifyVariant {
  price: string;
}

interface ShopifyImage {
  src: string;
}

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  product_type: string;
  tags: string | string[];
  variants: ShopifyVariant[];
  images: ShopifyImage[];
}

interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeTags(tags: string | string[]): string[] {
  return Array.isArray(tags)
    ? tags.filter(Boolean)
    : tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
}

function toNormalized(p: ShopifyProduct): NormalizedProduct {
  return {
    id: p.id,
    title: p.title,
    description: stripHtml(p.body_html || ""),
    productType: p.product_type || "",
    tags: normalizeTags(p.tags),
    price: parseFloat(p.variants?.[0]?.price || "0") || 0,
    variantCount: p.variants?.length || 1,
    imageUrl: p.images?.[0]?.src || null,
  };
}

export function normalizeShopifyUrl(input: string): string {
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);
  return `${url.protocol}//${url.hostname}`;
}

function buildUrlCandidates(origin: string): string[] {
  const hostname = new URL(origin).hostname;
  const parts = hostname.split(".");
  const bareDomain = parts.length > 2 ? parts.slice(-2).join(".") : hostname.replace(/^www\./, "");

  const candidates = [
    `https://${hostname}/products.json?limit=250`,
    `https://${hostname}/collections/all/products.json?limit=250`,
    `https://www.${bareDomain}/products.json?limit=250`,
    `https://www.${bareDomain}/collections/all/products.json?limit=250`,
    `https://${bareDomain}/products.json?limit=250`,
    `https://${bareDomain}/collections/all/products.json?limit=250`,
  ];
  return [...new Set(candidates)];
}

async function fetchJson(url: string): Promise<ShopifyProductsResponse | null> {
  try {
    const res = await fetch(url, {
      headers: { ...BROWSER_HEADERS, Referer: new URL(url).origin + "/" },
      redirect: "follow",
      cache: "no-store",
    });

    if (res.status === 401) throw new Error("PASSWORD_PROTECTED");
    // 404 and 403 both mean "not here" — try next candidate
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) return null;

    const data = (await res.json()) as ShopifyProductsResponse;
    if (!Array.isArray(data?.products) || data.products.length === 0) return null;
    return data;
  } catch (err) {
    if (err instanceof Error && err.message === "PASSWORD_PROTECTED") throw err;
    return null;
  }
}

// JSON-LD fallback: scrape homepage/collection page for structured data
async function fetchViaJsonLd(origin: string): Promise<NormalizedProduct[] | null> {
  try {
    const res = await fetch(`${origin}/collections/all`, {
      headers: { ...BROWSER_HEADERS, Accept: "text/html" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const html = await res.text();

    const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
      .map((m) => { try { return JSON.parse(m[1]); } catch { return null; } })
      .filter(Boolean);

    const products: NormalizedProduct[] = [];
    for (const block of blocks) {
      const items = block["@graph"] ?? (Array.isArray(block) ? block : [block]);
      for (const item of items) {
        if (item["@type"] === "Product" && item.name) {
          products.push({
            id: Math.abs(item.url?.split("/").pop()?.split("-").reduce((a: number, c: string) => a + c.charCodeAt(0), 0) ?? Math.random() * 1e9) | 0,
            title: item.name,
            description: item.description?.slice(0, 500) ?? "",
            productType: item.category ?? "",
            tags: [],
            price: parseFloat(item.offers?.price ?? item.offers?.[0]?.price ?? "0") || 0,
            variantCount: 1,
            imageUrl: item.image?.url ?? item.image ?? null,
          });
        }
      }
    }
    return products.length > 0 ? products.slice(0, MAX_PRODUCTS) : null;
  } catch {
    return null;
  }
}

// Sitemap fallback: parse /sitemap.xml → fetch individual product .json pages
async function fetchViaSitemap(origin: string): Promise<NormalizedProduct[] | null> {
  try {
    const sitemapRes = await fetch(`${origin}/sitemap.xml`, {
      headers: BROWSER_HEADERS,
      cache: "no-store",
    });
    if (!sitemapRes.ok) return null;

    const xml = await sitemapRes.text();

    // Shopify sitemaps may nest into sitemap_products_1.xml
    const nestedMatch = xml.match(/<loc>([^<]*sitemap_products[^<]*)<\/loc>/);
    let productXml = xml;
    if (nestedMatch) {
      const nested = await fetch(nestedMatch[1], { headers: BROWSER_HEADERS, cache: "no-store" });
      if (nested.ok) productXml = await nested.text();
    }

    // Extract product page URLs
    const locMatches = [...productXml.matchAll(/<loc>([^<]*)\/products\/([^<]+)<\/loc>/g)];
    if (locMatches.length === 0) return null;

    // Take first MAX_PRODUCTS unique product URLs
    const productUrls = [...new Set(locMatches.map((m) => m[0].replace(/<\/?loc>/g, "").trim()))]
      .slice(0, MAX_PRODUCTS);

    // Fetch each product as JSON (Shopify always serves .json on product pages)
    const results = await Promise.all(
      productUrls.map(async (pageUrl) => {
        try {
          const jsonUrl = pageUrl.replace(/\/$/, "") + ".json";
          const res = await fetch(jsonUrl, { headers: BROWSER_HEADERS, cache: "no-store" });
          if (!res.ok) return null;
          const ct = res.headers.get("content-type") ?? "";
          if (!ct.includes("json")) return null;
          const data = (await res.json()) as { product?: ShopifyProduct };
          if (!data?.product) return null;
          return toNormalized(data.product);
        } catch {
          return null;
        }
      })
    );

    const products = results.filter((p): p is NormalizedProduct => p !== null);
    return products.length > 0 ? products : null;
  } catch {
    return null;
  }
}

type FirecrawlProduct = { title: string; price?: number; description?: string; imageUrl?: string; productType?: string };

// Firecrawl fallback: full JS rendering + LLM extraction for bot-protected stores
async function fetchViaFirecrawl(origin: string): Promise<NormalizedProduct[] | null> {
  if (!process.env.FIRECRAWL_API_KEY) return null;
  try {
    console.log("[scraper] trying Firecrawl fallback");
    const app = getFirecrawl();

    const extractResult = await app.extract({
      urls: [`${origin}/collections/all`],
      prompt: `Extract up to ${MAX_PRODUCTS} ecommerce products from this page. For each product return: title, price (number), description (brief), imageUrl (absolute URL of product image), productType (category).`,
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
    } as Parameters<typeof app.extract>[0]);

    const data = (extractResult as { success?: boolean; data?: { products?: FirecrawlProduct[] } }).data;
    const rawProducts = data?.products;
    if (!Array.isArray(rawProducts) || rawProducts.length === 0) return null;

    console.log(`[scraper] Firecrawl extracted ${rawProducts.length} products`);
    return rawProducts.slice(0, MAX_PRODUCTS).map((p, i) => ({
      id: Date.now() + i,
      title: p.title,
      description: p.description?.slice(0, 500) ?? "",
      productType: p.productType ?? "",
      tags: [],
      price: p.price ?? 0,
      variantCount: 1,
      imageUrl: p.imageUrl ?? null,
    }));
  } catch (err) {
    console.error("[scraper] Firecrawl error:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function scrapeShopifyProducts(
  storeUrl: string
): Promise<{ storeName: string; products: NormalizedProduct[] }> {
  const origin = normalizeShopifyUrl(storeUrl);

  // Strategy 1: try /products.json and /collections/all/products.json variants
  let products: NormalizedProduct[] | null = null;

  for (const url of buildUrlCandidates(origin)) {
    const data = await fetchJson(url);
    if (data) {
      products = data.products.slice(0, MAX_PRODUCTS).map(toNormalized);
      break;
    }
  }

  // Strategy 2: sitemap fallback
  if (!products) {
    console.log("[scraper] trying sitemap fallback");
    products = await fetchViaSitemap(origin);
  }

  // Strategy 3: JSON-LD from HTML
  if (!products) {
    console.log("[scraper] trying JSON-LD fallback");
    products = await fetchViaJsonLd(origin);
  }

  // Strategy 4: Firecrawl — full JS rendering + LLM extraction (last resort)
  if (!products) {
    products = await fetchViaFirecrawl(origin);
  }

  if (!products || products.length === 0) {
    throw new Error(
      "We couldn't access this store automatically. Paste your product page URLs manually below and we'll analyze them."
    );
  }

  const hostname = new URL(origin).hostname.replace(/^www\./, "");
  const storeName = hostname.split(".")[0];
  const capitalizedName = storeName.charAt(0).toUpperCase() + storeName.slice(1);

  return { storeName: capitalizedName, products };
}
