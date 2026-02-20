
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview AI konfiguratsiyasi.
 * Farruxbek taqdim etgan API kalitdan foydalaniladi.
 */

const API_KEY = process.env.GOOGLE_GENAI_API_KEY || 'AIzaSyDmQYr26NuWXot50VdN4Dk1wHrRDcW2kkk';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: API_KEY,
    }),
  ],
});

// Barqaror va bepul kvotaga ega model
export const model = 'googleai/gemini-1.5-flash';
