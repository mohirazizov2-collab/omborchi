'use server';
/**
 * @fileOverview Hisobotlarni tahlil qilish uchun Genkit flow.
 * 
 * - analyzeReports - Hisobot ma'lumotlarini tahlil qiluvchi asosiy funksiya.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeReportsInputSchema = z.object({
  stats: z.object({
    totalValue: z.number(),
    warehouseCount: z.number(),
    productCount: z.number(),
    lowStockCount: z.number(),
  }),
  topProducts: z.array(z.object({
    name: z.string(),
    stock: z.number(),
    price: z.number(),
  })),
});

export type AnalyzeReportsInput = z.infer<typeof AnalyzeReportsInputSchema>;

const AnalyzeReportsOutputSchema = z.object({
  summary: z.string().describe('Hisobotning qisqacha mazmuni.'),
  analysis: z.string().describe('Batafsil tahlil va muammolar.'),
  recommendations: z.array(z.string()).describe('Biznes uchun tavsiyalar ro\'yxati.'),
});

export type AnalyzeReportsOutput = z.infer<typeof AnalyzeReportsOutputSchema>;

export async function analyzeReports(input: AnalyzeReportsInput): Promise<AnalyzeReportsOutput> {
  return analyzeReportsFlow(input);
}

const analyzePrompt = ai.definePrompt({
  name: 'analyzeReportsPrompt',
  input: { schema: AnalyzeReportsInputSchema },
  output: { schema: AnalyzeReportsOutputSchema },
  prompt: `Siz professional ombor boshqaruvi va logistika bo'yicha AI konsultantisiz.
Sizga omborchi.uz tizimidan olingan quyidagi ma'lumotlar taqdim etiladi:

Ma'lumotlar:
- Jami zaxira qiymati: ${{stats.totalValue}}
- Omborlar soni: {{stats.warehouseCount}} ta
- Mahsulot turlari: {{stats.productCount}} ta
- Kam qolgan mahsulotlar soni: {{stats.lowStockCount}} ta

Asosiy mahsulotlar ro'yxati:
{{#each topProducts}}
- {{name}}: {{stock}} ta (Narxi: ${{price}})
{{/each}}

Vazifangiz:
1. Ushbu ma'lumotlarni tahlil qiling.
2. Omborning holati haqida qisqacha xulosa (summary) bering.
3. Zaxiralarni boshqarishdagi muammolar va trendlarni (analysis) yozing.
4. Biznes samaradorligini oshirish uchun kamida 3 ta aniq tavsiya (recommendations) bering.

Javobni o'zbek tilida, Senior darajadagi tahlilchi kabi professional tarzda tayyorlang.`,
});

const analyzeReportsFlow = ai.defineFlow(
  {
    name: 'analyzeReportsFlow',
    inputSchema: AnalyzeReportsInputSchema,
    outputSchema: AnalyzeReportsOutputSchema,
  },
  async (input) => {
    const { output } = await analyzePrompt(input);
    if (!output) throw new Error('AI tahlili muvaffaqiyatsiz tugadi.');
    return output;
  }
);
