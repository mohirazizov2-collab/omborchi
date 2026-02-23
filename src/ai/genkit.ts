
import { genkit } from 'genkit';
import { openAI } from 'genkitx-openai';

/**
 * @fileOverview AI konfiguratsiyasi (OpenAI).
 */

const API_KEY = process.env.OPENAI_API_KEY || '';

if (!API_KEY && process.env.NODE_ENV === 'production') {
  console.warn('DIQQAT: OPENAI_API_KEY topilmadi. AI funksiyalari ishlamasligi mumkin.');
}

export const ai = genkit({
  plugins: [
    openAI({
      apiKey: API_KEY,
    }),
  ],
});

// OpenAI ning eng samarali va arzon modeli
export const model = 'openai/gpt-4o-mini';
