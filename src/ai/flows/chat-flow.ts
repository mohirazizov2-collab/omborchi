'use server';
/**
 * @fileOverview Omborchi GPT - Aqlli yordamchi uchun Genkit flow.
 * Bu flow mahsulotlar va omborlar haqida real ma'lumotlarni olish uchun asboblarga (tools) ega.
 */

import { ai, model } from '@/ai/genkit';
import { z } from 'genkit';
import { initializeFirebase } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';

// --- AI ASBOBLARI (TOOLS) ---

/** Mahsulot qoldig'ini tekshirish asbobi */
const checkProductStock = ai.defineTool(
  {
    name: "checkProductStock",
    description: "Ombordagi muayyan mahsulotning joriy qoldig'ini va narxini tekshiradi.",
    inputSchema: z.object({
      productName: z.string().describe("Mahsulot nomi (to'liq yoki qisman)"),
    }),
    outputSchema: z.array(z.object({
      name: z.string(),
      stock: z.number(),
      price: z.number(),
      unit: z.string(),
    })),
  },
  async (input) => {
    const { firestore } = initializeFirebase();
    const snapshot = await getDocs(collection(firestore, "products"));
    const results = snapshot.docs
      .map(doc => doc.data())
      .filter(p => p.name.toLowerCase().includes(input.productName.toLowerCase()))
      .map(p => ({
        name: p.name,
        stock: p.stock || 0,
        price: p.salePrice || 0,
        unit: p.unit || "dona"
      }));
    return results;
  }
);

/** Omborlar ro'yxatini olish asbobi */
const listWarehouses = ai.defineTool(
  {
    name: "listWarehouses",
    description: "Tizimdagi barcha faol omborxonalar va ularning manzillarini ko'rsatadi.",
    inputSchema: z.object({}),
    outputSchema: z.array(z.object({
      name: z.string(),
      address: z.string(),
      phone: z.string(),
    })),
  },
  async () => {
    const { firestore } = initializeFirebase();
    const snapshot = await getDocs(collection(firestore, "warehouses"));
    return snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        name: d.name,
        address: d.address || "Manzil yo'q",
        phone: d.phoneNumber || "Telefon yo'q"
      };
    });
  }
);

// --- FLOW DEFINITION ---

const ChatInputSchema = z.object({
  message: z.string().describe("Foydalanuvchi xabari"),
  history: z.array(z.object({
    role: z.enum(["user", "model"]),
    content: z.string()
  })).optional().describe("Suhbat tarixi"),
});

export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  response: z.string().describe("AI javobi"),
});

export type ChatOutput = z.infer<typeof ChatOutputSchema>;

const chatPrompt = ai.definePrompt({
  name: "chatPrompt",
  model: model,
  tools: [checkProductStock, listWarehouses],
  input: { schema: ChatInputSchema },
  output: { schema: ChatOutputSchema },
  prompt: `Siz "ombor.uz" tizimining aqlli va kuchli yordamchisisiz. Ismingiz - Omborchi GPT.
Sizning vazifangiz ombor boshqaruvi, logistika va inventarizatsiya bo'yicha foydalanuvchilarga yordam berish.

Sizda quyidagi imkoniyatlar bor:
1. Mahsulotlar qoldig'ini va narxini bazadan qidirib topish (checkProductStock asbobi orqali).
2. Omborlar ro'yxatini va manzillarini ko'rsatish (listWarehouses asbobi orqali).

Qoidalar:
- Javoblaringiz qisqa, aniq va professional bo'lsin.
- O'zbek tilida muloqot qiling.
- Agar foydalanuvchi mahsulot qoldig'ini so'rasa, albatta asbobdan foydalaning.
- Pul summalarini '100 000 so'm' formatida ko'rsating.

Suhbat tarixi:
{{#each history}}
{{role}}: {{{content}}}
{{/each}}

Foydalanuvchi xabari: {{{message}}}`,
});

export async function chatWithAI(input: ChatInput): Promise<ChatOutput> {
  return chatWithAIFlow(input);
}

const chatWithAIFlow = ai.defineFlow(
  {
    name: "chatWithAIFlow",
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    const { output } = await chatPrompt(input);
    if (!output) throw new Error("Omborchi GPT hozirda javob bera olmaydi.");
    return output;
  }
);
