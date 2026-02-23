import { genkit } from 'genkit';
import { openAI } from 'genkitx-openai';

/**
 * @fileOverview AI konfiguratsiyasi (OpenAI).
 */

const API_KEY = process.env.OPENAI_API_KEY || '';

export const ai = genkit({
  plugins: [
    openAI({
      apiKey: API_KEY,
    }),
  ],
});

// OpenAI gpt-4o-mini modeli
export const model = 'openai/gpt-4o-mini';
