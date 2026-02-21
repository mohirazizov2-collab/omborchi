
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview AI konfiguratsiyasi.
 * Muhit o'zgaruvchisidan (Environment Variable) foydalaniladi.
 */

const API_KEY = process.env.GOOGLE_GENAI_API_KEY;

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: API_KEY || 'AIzaSyASDjVEDtI1g3esWeu87wDoOAjUr2fM1GI', // Netlify-da sozlanishi kerak
    }),
  ],
});

// Barqaror model
export const model = 'googleai/gemini-1.5-flash';
