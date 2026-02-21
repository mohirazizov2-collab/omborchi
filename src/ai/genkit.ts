
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview AI konfiguratsiyasi.
 * Muhit o'zgaruvchisidan (Environment Variable) foydalaniladi.
 */

const API_KEY = process.env.GOOGLE_GENAI_API_KEY;

if (!API_KEY && process.env.NODE_ENV === 'production') {
  console.warn('DIQQAT: GOOGLE_GENAI_API_KEY topilmadi. AI funksiyalari ishlamasligi mumkin.');
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: API_KEY || 'AIzaSyASDjVEDtI1g3esWeu87wDoOAjUr2fM1GI', // Development uchun vaqtinchalik kalit
    }),
  ],
});

// Barqaror model
export const model = 'googleai/gemini-1.5-flash';
