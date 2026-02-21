'use server';
/**
 * @fileOverview ombor.uz AI Assistant uchun Genkit flow.
 */

import { ai, model } from '@/ai/genkit';
import { z } from 'genkit';

const ChatInputSchema = z.object({
  message: z.string().describe('Foydalanuvchi xabari'),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string()
  })).optional().describe('Suhbat tarixi'),
});

export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  response: z.string().describe('AI javobi'),
});

export type ChatOutput = z.infer<typeof ChatOutputSchema>;

export async function chatWithAI(input: ChatInput): Promise<ChatOutput> {
  return chatWithAIFlow(input);
}

const chatPrompt = ai.definePrompt({
  name: 'chatPrompt',
  model: model,
  input: { schema: ChatInputSchema },
  output: { schema: ChatOutputSchema },
  prompt: `Siz "ombor.uz" tizimining aqlli yordamchisisiz. Sizning ismingiz - Ombor AI.
Sizning vazifangiz foydalanuvchilarga ombor boshqaruvi, logistika, inventarizatsiya va tizimdan foydalanish bo'yicha yordam berishdir.

Maxsus funksiya: "Tizim Gen" haqida ma'lumot:
- "Tizim Gen" (System Gen) - bu foydalanuvchi talablariga asoslanib yangi tizim arxitekturasini (bazalar, kodlar, papkalar) avtomatik yaratib beruvchi AI vositadir.
- U dasturchilar va biznes egalariga yangi modullarni tezkor yaratishda yordam beradi.

Muloqot qoidalari:
1. Doimo xushmuomala va professional bo'ling.
2. Javoblarni o'zbek tilida bering.
3. Agar foydalanuvchi tizim funksiyalari (kirim, chiqim, transfer, hisobot, Tizim Gen) haqida so'rasa, ularga qisqacha tushuntirish bering.
4. Javoblaringiz qisqa va lo'nda bo'lsin.

Suhbat tarixi:
{{#each history}}
{{role}}: {{{content}}}
{{/each}}

Foydalanuvchi xabari: {{{message}}}`,
});

const chatWithAIFlow = ai.defineFlow(
  {
    name: 'chatWithAIFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    const { output } = await chatPrompt(input);
    if (!output) throw new Error('AI javob bera olmadi.');
    return output;
  }
);
