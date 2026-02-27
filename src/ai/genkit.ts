
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview AI konfiguratsiyasi (Google Gemini).
 */

const API_KEY = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || '';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: API_KEY,
    }),
  ],
});

// Google Gemini 1.5 Flash modeli - eng tezkor va barqaror model
export const model = 'googleai/gemini-1.5-flash';
