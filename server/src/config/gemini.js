import { GoogleGenAI } from '@google/genai';
import { HttpError } from '../utils/HttpError.js';

let cachedKey = null;
let cachedClient = null;

export function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY?.trim() || null;
}

/**
 * Shared server-side GoogleGenAI client with required AI Studio telemetry header.
 * Re-creates client if the runtime GEMINI_API_KEY changes.
 */
export function getGeminiClient() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new HttpError(
      503,
      'Gemini API key is not configured on this server. Add GEMINI_API_KEY in Settings > Secrets.',
    );
  }
  if (!cachedClient || cachedKey !== apiKey) {
    cachedKey = apiKey;
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedClient;
}
