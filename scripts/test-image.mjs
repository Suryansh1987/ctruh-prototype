import { AzureOpenAI } from "openai";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { execFileSync } from "child_process";

const envPath = resolve(process.cwd(), ".env");

if (!existsSync(envPath)) {
  throw new Error("Missing .env in project root");
}

const envVars = readFileSync(envPath, "utf-8")
  .split("\n")
  .filter((line) => line.trim() && !line.startsWith("#"))
  .reduce((acc, line) => {
    const idx = line.indexOf("=");
    if (idx === -1) return acc;
    acc[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    return acc;
  }, {});

function baseUrl(raw) {
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return raw;
  }
}

const rawEndpoint = envVars.OPENAI_IMAGE_ENDPOINT || envVars.OPENAI_ENDPOINT;
const endpoint = baseUrl(rawEndpoint);
const apiKey = envVars.OPENAI_IMAGE_API_KEY || envVars.OPENAI_API_KEY;
const apiVersion = envVars.OPENAI_IMAGE_API_VERSION || envVars.OPENAI_API_VERSION;
const model = envVars.OPENAI_IMAGE_MODEL || "gpt-image-1-mini";
const sourceSize = envVars.OPENAI_IMAGE_SIZE || "1536x1024";
const outputDir = resolve(process.cwd(), "public", "generated");

if (!rawEndpoint || !apiKey || !apiVersion) {
  throw new Error(
    "Missing image credentials. Set OPENAI_IMAGE_ENDPOINT, OPENAI_IMAGE_API_KEY, OPENAI_IMAGE_API_VERSION in .env"
  );
}

mkdirSync(outputDir, { recursive: true });

const client = new AzureOpenAI({ endpoint, apiKey, apiVersion });

const sharedStyle = [
  "Apple keynote presentation aesthetic.",
  "Stripe inspired enterprise SaaS design.",
  "Linear visual language.",
  "Pure white background (#FFFFFF).",
  "Electric blue accents (#0057FF).",
  "No dark backgrounds, no purple, no gradients.",
  "Luxury product marketing artwork.",
  "Premium technology storytelling.",
  "Sophisticated shadows.",
  "Ultra-clean composition with massive whitespace.",
  "Cinematic enterprise software launch visuals.",
  "Photorealistic UI elements only where appropriate.",
  "Highly polished, world-class startup branding, award-winning design quality.",
  "16:9 horizontal composition.",
].join(" ");

const prompts = [
  {
    slug: "store-discovery",
    title: "Discovery",
    prompt:
      'Ultra-premium enterprise AI product marketing artwork, massive centered ecommerce store URL input floating in space, text inside the input reads "gymshark.com", electric blue border (#0057FF) with soft ambient glow, cinematic lighting, the URL acting like a portal, hundreds of subtle ecommerce signals emerging from the input field, premium apparel, sneakers, watches, accessories, beauty products beginning to materialize from inside the website, elegant blue data streams connecting products to the URL, no browser chrome, no dashboard UI, minimal luxury composition, futuristic enterprise SaaS storytelling, sophisticated shadows, highly polished product reveal, center-focused composition.',
  },
  {
    slug: "inventory-intelligence",
    title: "Inventory Intelligence",
    prompt:
      "Premium AI intelligence visualization, hundreds of ecommerce products floating elegantly through space around a glowing blue AI core, apparel, shoes, luxury watches, jewelry, furniture, beauty products, electronics, products orbiting around a central intelligence engine, subtle electric blue scanning beams analyzing each item, sophisticated enterprise AI aesthetic, products arranged in elegant three-dimensional depth, soft shadows, clean whitespace, luxury SaaS product marketing artwork, futuristic commerce intelligence, highly refined composition, enterprise-grade AI storytelling.",
  },
  {
    slug: "product-analysis",
    title: "Product Analysis",
    prompt:
      "Beautiful AI categorization scene, floating products automatically organizing themselves into premium category pillars, large elegant category cards labeled Fashion, Furniture, Beauty, Electronics, products smoothly flowing into their appropriate groups using glowing blue pathways, visual representation of intelligent organization, luxury enterprise software marketing illustration, Stripe inspired simplicity, clean geometry, subtle blue connection lines, futuristic yet realistic, high-end AI system revealing hidden structure, sophisticated depth and lighting, minimalistic composition.",
  },
  {
    slug: "xr-opportunity-detection",
    title: "Opportunity Detection",
    prompt:
      "Cinematic transformation visualization in a luxury white environment, three hero products suspended in space, premium wristwatch transforming into an interactive 3D viewer, luxury sofa transforming into an augmented reality room placement experience, apparel transforming into virtual try-on technology, elegant electric blue energy surrounding each transformation, subtle holographic overlays, AI opportunity detection visualization, highly polished product storytelling, enterprise innovation marketing artwork, soft lighting, clean whitespace, premium futuristic commerce technology, luxury SaaS visual language.",
  },
  {
    slug: "revenue-impact-analysis",
    title: "Revenue Simulation",
    prompt:
      "Executive-level business intelligence visualization, premium revenue dashboard floating in space without browser framing, elegant metrics showing Conversion Rate increasing, Engagement increasing, Returns decreasing, large green revenue indicators (#00C48C), sophisticated electric blue analytics lines, upward momentum visualized through beautiful data flows, enterprise software aesthetic, Stripe inspired financial design, luxury consulting presentation quality, clean typography, premium SaaS storytelling, optimistic future-focused atmosphere, minimal composition with powerful business impact visualization.",
  },
  {
    slug: "xr-experience-blueprint",
    title: "Experience Blueprint",
    prompt:
      "Architectural blueprint generation scene in a pure white premium environment, central AI intelligence engine generating immersive commerce experiences, elegant wireframe virtual showroom emerging from blueprints, interactive 3D product viewer materializing from design plans, augmented reality shopping experiences being assembled in real time, electric blue blueprint lines transitioning into finished experiences, luxury enterprise innovation visualization, futuristic commerce platform storytelling, clean minimal composition, premium software product launch artwork, highly sophisticated and aspirational.",
  },
  {
    slug: "actionable-recommendation-report",
    title: "Recommendations",
    prompt:
      "Executive recommendation report revealed on a pristine white background, luxury consulting presentation aesthetic, premium AI-generated strategy document floating elegantly in space, large XR Score 8.9/10 displayed prominently, priority products highlighted with electric blue accents, implementation roadmap visible, opportunity rankings and recommended experiences organized beautifully, enterprise decision-making visualization, premium SaaS storytelling, highly polished executive report, sophisticated typography, subtle shadows, luxury business transformation narrative.",
  },
  {
    slug: "future-xr-store",
    title: "The Transformation",
    prompt:
      "Stunning next-generation ecommerce experience, immersive future storefront visualized in a luxury white environment, customers interacting naturally with 3D products, virtual try-on experiences integrated seamlessly into the shopping journey, interactive product configurators, augmented reality product placement, premium futuristic retail ecosystem, electric blue accents throughout the experience, highly aspirational commerce future, luxury enterprise innovation storytelling, cinematic product marketing artwork, sophisticated lighting, showing the completed transformation from traditional ecommerce to immersive commerce.",
  },
];

function buildPrompt(title, prompt) {
  return [
    "Use case: ads-marketing",
    "Asset type: product launch storytelling illustration series",
    `Scene name: ${title}`,
    `Primary request: ${prompt}`,
    `Style direction: ${sharedStyle}`,
    "Composition: one premium focal scene per slide, no repeated dashboards, no repeated browser windows, strong visual progression like chapters in a product launch video, soft ambient lighting, and generous negative space for carousel use.",
    "Color palette: white dominant composition with electric blue accents and green only for positive business metrics where relevant.",
    "Output requirements: exact same style family as the rest of the series, premium business transformation narrative, no visible brand logos, no dark colors, no purple, no gradients, no cluttered interface chrome, no UI gibberish.",
  ].join("\n");
}

async function downloadImage(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Image download failed with ${response.status}`);
  }

  const contentType = response.headers.get("content-type")?.split(";")[0] || "image/png";
  const extension = contentType === "image/jpeg" ? "jpg" : contentType === "image/webp" ? "webp" : "png";

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    extension,
  };
}

function cropTo16By9(filePath) {
  execFileSync("sips", ["--cropToHeightWidth", "864", "1536", filePath], {
    stdio: "ignore",
  });
}

async function generateOne({ slug, title, prompt }, index) {
  const fullPrompt = buildPrompt(title, prompt);

  console.log(`\n[${index + 1}/${prompts.length}] ${title}`);
  console.log(`Prompt: ${prompt}\n`);

  const response = await client.images.generate({
    model,
    prompt: fullPrompt,
    n: 1,
    size: sourceSize,
  });

  const img = response.data?.[0];

  if (!img) {
    throw new Error(`No image returned for ${slug}`);
  }

  let buffer;
  let extension = "png";

  if (img.b64_json) {
    buffer = Buffer.from(img.b64_json, "base64");
  } else if (img.url) {
    const downloaded = await downloadImage(img.url);
    buffer = downloaded.buffer;
    extension = downloaded.extension;
  } else {
    throw new Error(`No usable image payload returned for ${slug}`);
  }

  const outputPath = resolve(outputDir, `${slug}.${extension}`);
  writeFileSync(outputPath, buffer);

  if (sourceSize === "1536x1024" && extension !== "gif") {
    cropTo16By9(outputPath);
  }

  console.log(`Saved ${outputPath}`);
}

console.log("Endpoint (raw) :", rawEndpoint);
console.log("Endpoint (base):", endpoint);
console.log("API Version    :", apiVersion);
console.log("Model          :", model);
console.log("Size           :", sourceSize, "-> cropped to 1536x864 when applicable");
console.log("Output Dir     :", outputDir);
console.log("Key (last 4)   :", apiKey.slice(-4));

try {
  for (const [index, entry] of prompts.entries()) {
    await generateOne(entry, index);
  }

  console.log("\nAll 8 images generated successfully.");
} catch (err) {
  console.error("\nImage generation failed.");
  console.error("Status :", err.status);
  console.error("Code   :", err.error?.code);
  console.error("Message:", err.error?.message || err.message);
  process.exitCode = 1;
}
