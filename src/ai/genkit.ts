import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Genkit AI konfiguratsiyasi.
 * 
 * Bu yerda Google AI plugini va Gemini modeli sozlanadi.
 * API kaliti avtomatik ravishda GOOGLE_GENAI_API_KEY muhit o'zgaruvchisidan olinadi.
 */

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
  ],
  model: 'googleai/gemini-1.5-flash',
});
