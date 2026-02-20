import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Genkit AI konfiguratsiyasi.
 * 
 * Bu yerda Google AI plugini va Gemini modeli sozlanadi.
 * API kaliti .env faylidagi GOOGLE_GENAI_API_KEY dan olinadi.
 */

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY || 'AIzaSyDmQYr26NuWXot50VdN4Dk1wHrRDcW2kkk',
    }),
  ],
});

export const model = 'googleai/gemini-1.5-flash';