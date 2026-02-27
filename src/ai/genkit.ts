
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview AI konfiguratsiyasi (Google Gemini).
 * Genkit 1.x standartiga moslangan.
 */

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY,
    }),
  ],
});

// Genkit 1.x uchun Google AI provayderi bilan model nomi
export const model = 'googleai/gemini-1.5-flash';
