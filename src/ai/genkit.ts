
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Google Gemini orqali Genkit konfiguratsiyasi.
 * Siz taqdim etgan API kalitidan foydalaniladi.
 */

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: 'AIzaSyDmQYr26NuWXot50VdN4Dk1wHrRDcW2kkk',
    }),
  ],
});

// Barqaror Gemini 1.5 Flash modeli
export const model = 'googleai/gemini-1.5-flash';
