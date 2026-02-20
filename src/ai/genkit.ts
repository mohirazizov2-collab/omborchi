import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Genkit AI konfiguratsiyasi.
 * 
 * Bu yerda Google AI plugini va Gemini modeli sozlanadi.
 * API kaliti avtomatik ravishda GOOGLE_GENAI_API_KEY yoki GOOGLE_API_KEY 
 * muhit o'zgaruvchilaridan olinadi.
 */

export const ai = genkit({
  plugins: [
    googleAI(), // Plugini o'zi standart nomlar bo'yicha API kalitini qidiradi
  ],
  model: 'googleai/gemini-1.5-flash', // Eng barqaror va tezkor model
});
