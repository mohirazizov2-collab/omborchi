import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview AI konfiguratsiyasi (Server-side only).
 * Netlify yoki Vercel-da GOOGLE_GENAI_API_KEY nomi bilan sozlanishi shart.
 */

const API_KEY = process.env.GOOGLE_GENAI_API_KEY || '';

if (!API_KEY && process.env.NODE_ENV === 'production') {
  console.warn('DIQQAT: GOOGLE_GENAI_API_KEY topilmadi. AI funksiyalari ishlamasligi mumkin.');
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: API_KEY,
    }),
  ],
});

// Foydalanuvchi so'ragan Gemini 1.5 modeli
export const model = 'googleai/gemini-1.5-flash';
