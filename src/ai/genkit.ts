
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview AI konfiguratsiyasi.
 * Muhit o'zgaruvchisidan (Environment Variable) foydalaniladi.
 * Netlify-da GOOGLE_GENAI_API_KEY nomi bilan sozlanishi shart.
 */

const API_KEY = process.env.GOOGLE_GENAI_API_KEY;

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: API_KEY,
    }),
  ],
});

// Barqaror model
export const model = 'googleai/gemini-1.5-flash';
