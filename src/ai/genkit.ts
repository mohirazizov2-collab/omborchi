
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview AI konfiguratsiyasi.
 * Farruxbek taqdim etgan Gemini API kalitidan foydalaniladi.
 */

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: 'AIzaSyDmQYr26NuWXot50VdN4Dk1wHrRDcW2kkk',
    }),
  ],
});

// Barqaror va bepul kvotaga ega model
export const model = 'googleai/gemini-1.5-flash';
