
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Omborchi.uz AI Konfiguratsiyasi (Genkit 1.x)
 * 
 * Google Gemini modelini sozlash va API kalitni ulash.
 */

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY,
    }),
  ],
});

// Genkit 1.x uchun eng barqaror Gemini modeli identifikatori
export const model = 'googleai/gemini-1.5-flash';
