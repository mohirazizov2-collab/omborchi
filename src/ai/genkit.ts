import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Genkit AI konfiguratsiyasi.
 * 
 * API kaliti foydalanuvchi tomonidan taqdim etildi va tizimga qattiq biriktirildi.
 */

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: 'AIzaSyDmQYr26NuWXot50VdN4Dk1wHrRDcW2kkk',
    }),
  ],
});

export const model = 'googleai/gemini-1.5-flash';
