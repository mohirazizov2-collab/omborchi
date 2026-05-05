import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
 
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY!,
    }),
  ],
  model: 'googleai/gemini-1.5-flash',
});
 
// model ni alohida export qilish — flow fayllar import qilishi uchun
export const model = 'googleai/gemini-1.5-flash';
