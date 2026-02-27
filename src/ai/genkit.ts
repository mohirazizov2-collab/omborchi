
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview AI konfiguratsiyasi (Google Gemini).
 */

const API_KEY = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || '';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: API_KEY,
    }),
  ],
});

// Google Gemini 1.5 Flash modeli identifikatori
// Genkit 1.x da modelni string ko'rinishida ko'rsatish eng xavfsiz usuldir
export const model = 'googleai/gemini-1.5-flash';
