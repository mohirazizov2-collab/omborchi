
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview AI konfiguratsiyasi.
 * Foydalanuvchi taqdim etgan yangi API kalitdan foydalaniladi.
 */

const API_KEY = process.env.GOOGLE_GENAI_API_KEY || 'AIzaSyASDjVEDtI1g3esWeu87wDoOAjUr2fM1GI';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: API_KEY,
    }),
  ],
});

// Barqaror va bepul kvotaga ega model
export const model = 'googleai/gemini-1.5-flash';
