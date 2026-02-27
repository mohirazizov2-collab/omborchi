
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
      apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || 'AIzaSyC9G1AR3Cvf1oy_8wltCTytiqRCzFg5Y_4',
    }),
  ],
});

// Genkit 1.x uchun Google AI provayderidagi eng barqaror model nomi
export const model = 'googleai/gemini-1.5-flash';
