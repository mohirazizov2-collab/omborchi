import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Firebase Studio va turli muhitlarda ishlatilishi mumkin bo'lgan barcha API kalit nomlarini tekshiramiz
const apiKey = process.env.GOOGLE_GENAI_API_KEY || 
               process.env.GEMINI_API_KEY || 
               process.env.GOOGLE_API_KEY || 
               process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: apiKey,
    }),
  ],
  model: 'googleai/gemini-1.5-flash', // Eng barqaror va tezkor model
});
