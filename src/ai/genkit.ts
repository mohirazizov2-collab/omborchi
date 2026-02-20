
import { genkit } from 'genkit';
import { openAI } from 'genkitx-openai';

/**
 * @fileOverview Genkit AI konfiguratsiyasi.
 * 
 * OpenAI platformasiga o'tkazildi (genkitx-openai orqali).
 */

export const ai = genkit({
  plugins: [
    openAI({
      apiKey: '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',
    }),
  ],
});

// OpenAI gpt-4o modeli o'rnatildi
export const model = 'openai/gpt-4o';
