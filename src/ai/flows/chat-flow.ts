
'use server';
/**
 * @fileOverview Omborchi GPT - Aqlli yordamchi mantiqi.
 * 
 * - chatWithAI - AI bilan muloqot qilish funksiyasi.
 * - checkProductStock - Ombordagi qoldiqlarni tekshirish asbobi.
 * - listWarehouses - Omborlar ro'yxatini olish asbobi.
 */

import { ai, model } from '@/ai/genkit';
import { z } from 'genkit';
import { initializeFirebase } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';

// --- AI ASBOBLARI (TOOLS) ---

const checkProductStock = ai.defineTool(
  {
    name: "checkProductStock",
    description: "Ombordagi mahsulot qoldig'i, narxi va o'lcham birligini tekshiradi.",
    inputSchema: z.object({
      productName: z.string().describe("Qidirilayotgan mahsulot nomi (to'liq yoki qisman)"),
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
      .filter(p => !p.isDeleted && p.name.toLowerCase().includes(input.productName.toLowerCase()))
      .map(p => ({
        name: p.name,
        stock: p.stock || 0,
        price: p.salePrice || 0,
        unit: p.unit || "dona"
      }));
    return results;
  }
);

const listWarehouses = ai.defineTool(
  {
    name: "listWarehouses",
    description: "Tizimdagi barcha faol omborlar haqida ma'lumot beradi.",
    inputSchema: z.object({}),
    outputSchema: z.array(z.object({
      name: z.string(),
      address: z.string(),
      manager: z.string(),
    })),
  },
  async () => {
    const { firestore } = initializeFirebase();
    const snapshot = await getDocs(collection(firestore, "warehouses"));
    return snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        name: d.name,
        address: d.address || "Manzil noma'lum",
        manager: d.managerName || "Tayinlanmagan"
      };
    });
  }
);

// --- FLOW DEFINITION ---

const ChatInputSchema = z.object({
  message: z.string().describe("Foydalanuvchining yangi xabari"),
  history: z.array(z.object({
    role: z.enum(["user", "model"]),
    content: z.string()
  })).optional().describe("Suhbat tarixi"),
});

export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  response: z.string().describe("AI tomonidan tayyorlangan javob"),
});

export type ChatOutput = z.infer<typeof ChatOutputSchema>;

const chatPrompt = ai.definePrompt({
  name: "chatPrompt",
  model: model,
  tools: [checkProductStock, listWarehouses],
  input: { schema: ChatInputSchema },
  output: { schema: ChatOutputSchema },
  prompt: `Siz "omborchi.uz" tizimining Senior darajadagi professional konsultantisiz. 
Ismingiz - Omborchi GPT.

ASOSIY VAZIFALAR:
1. Ombor boshqaruvi, logistika va moliyaviy tahlil bo'yicha yordam berish.
2. Mahsulot qoldiqlari yoki omborlar haqida so'rashsa, albatta 'checkProductStock' yoki 'listWarehouses' asboblaridan foydalanish.
3. Foydalanuvchilarga professional, do'stona va aniq maslahatlar berish.

MAJBURIY QOIDALAR:
- FAQAT o'zbek tilida javob bering.
- Narxlarni '100 000 so'm' formatida yozing.
- "o'" va "g'" harflarini har doim to'g'ri ishlating.
- Agar savol ombor tizimiga aloqador bo'lmasa, uni muloyimlik bilan rad eting.

KONTEKST:
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
    // API kalit mavjudligini tekshirish
    if (!process.env.GOOGLE_GENAI_API_KEY && !process.env.GEMINI_API_KEY) {
      throw new Error("AI API kaliti topilmadi. .env faylini tekshiring.");
    }

    try {
      const { output } = await chatPrompt(input);
      if (!output) throw new Error("AI javob tayyorlay olmadi.");
      return output;
    } catch (err: any) {
      console.error("Genkit Flow Error:", err);
      // Xatolik xabarini foydalanuvchiga tushunarli qilish
      if (err.message?.includes('expired')) {
        throw new Error("API kalitining muddati tugagan. Iltimos, yangilang.");
      }
      throw err;
    }
  }
);
