import { AzureOpenAI } from "openai";

// Chat client — GPT-4o for scoring + email
let _chatClient: AzureOpenAI | null = null;

export function getOpenAI(): AzureOpenAI {
  if (!_chatClient) {
    const endpoint = process.env.OPENAI_ENDPOINT;
    const apiKey = process.env.OPENAI_API_KEY;
    const apiVersion = process.env.OPENAI_API_VERSION;

    if (!endpoint || !apiKey || !apiVersion) {
      throw new Error(
        "Missing chat credentials. Set OPENAI_ENDPOINT, OPENAI_API_KEY, OPENAI_API_VERSION in .env"
      );
    }

    _chatClient = new AzureOpenAI({ endpoint, apiKey, apiVersion });
  }
  return _chatClient;
}

// Strips path/query from a URL — Azure SDK only wants the base hostname
function baseUrl(raw: string): string {
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return raw;
  }
}

// Image client — uses OPENAI_IMAGE_* if set, falls back to main client
let _imageClient: AzureOpenAI | null = null;

export function getImageOpenAI(): AzureOpenAI {
  if (!_imageClient) {
    const endpoint = process.env.OPENAI_IMAGE_ENDPOINT || process.env.OPENAI_ENDPOINT;
    const apiKey = process.env.OPENAI_IMAGE_API_KEY || process.env.OPENAI_API_KEY;
    const apiVersion = process.env.OPENAI_IMAGE_API_VERSION || process.env.OPENAI_API_VERSION;

    if (!endpoint || !apiKey || !apiVersion) {
      throw new Error(
        "Missing image credentials. Set OPENAI_IMAGE_ENDPOINT, OPENAI_IMAGE_API_KEY, OPENAI_IMAGE_API_VERSION in .env"
      );
    }

    _imageClient = new AzureOpenAI({ endpoint: baseUrl(endpoint), apiKey, apiVersion });
  }
  return _imageClient;
}

export const GPT_MODEL = process.env.OPENAI_MODEL || "gpt-4o";
export const DALLE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1-mini";
