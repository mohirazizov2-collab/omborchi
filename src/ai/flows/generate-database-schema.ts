'use server';

/**
 * @fileOverview A Genkit flow that generates PostgreSQL SQL schema and Prisma schema based on application requirements.
 *
 * - generateDatabaseSchema - A function that generates database schemas.
 * - GenerateDatabaseSchemaInput - The input type for the generateDatabaseSchema function.
 * - GenerateDatabaseSchemaOutput - The return type for the generateDatabaseSchema function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateDatabaseSchemaInputSchema = z.object({
  requirements: z.string().describe('The complete application requirements for OmniStock, including functional, technical, and table details.'),
});
export type GenerateDatabaseSchemaInput = z.infer<typeof GenerateDatabaseSchemaInputSchema>;

const GenerateDatabaseSchemaOutputSchema = z.object({
  postgresqlSchema: z.string().describe('The complete PostgreSQL SQL schema, including table definitions, foreign keys, indexes, and constraints, based on the provided requirements.'),
  prismaSchema: z.string().describe('The complete Prisma schema, including models, relations, and fields, corresponding to the generated PostgreSQL SQL schema.'),
});
export type GenerateDatabaseSchemaOutput = z.infer<typeof GenerateDatabaseSchemaOutputSchema>;

export async function generateDatabaseSchema(input: GenerateDatabaseSchemaInput): Promise<GenerateDatabaseSchemaOutput> {
  return generateDatabaseSchemaFlow(input);
}

const generateDatabaseSchemaPrompt = ai.definePrompt({
  name: 'generateDatabaseSchemaPrompt',
  input: { schema: GenerateDatabaseSchemaInputSchema },
  output: { schema: GenerateDatabaseSchemaOutputSchema },
  prompt: `You are an expert database architect specialized in PostgreSQL and Prisma.
Your task is to generate both a complete PostgreSQL SQL schema and a corresponding Prisma schema based on the provided application requirements for an inventory management system called OmniStock.

Pay close attention to all details, constraints, and business rules specified in the requirements.
Ensure the following are accurately reflected:
- All tables mentioned in section "6️⃣ Asosiy Jadvalar" (users, roles, warehouses, products, categories, suppliers, goods_receipts, goods_receipt_items, goods_issues, goods_issue_items, transfers, transfer_items, stock_movements, audit_logs).
- Unique constraints (e.g., SKU for products, delivery_note_number for goods receipts).
- Referential integrity for all relationships between tables.
- Soft delete implementation (e.g., 'deleted_at' timestamp field) where required for warehouses and products.
- The stock_movements table MUST accurately record ALL stock changes, as per business rules.
- Appropriate data types for each field (e.g., UUID for IDs, timestamp for dates, numeric for prices/quantities).
- Indexes for frequently queried columns, especially foreign keys and search fields.
- Default values where appropriate (e.g., created_at, updated_at).

The output should be a JSON object with two top-level keys: "postgresqlSchema" and "prismaSchema".
The value for "postgresqlSchema" should be a single string containing the full PostgreSQL SQL DDL.
The value for "prismaSchema" should be a single string containing the full Prisma schema definition.

---
Application Requirements:
{{{requirements}}}
---

Please provide the output in the specified JSON format.
`,
});

const generateDatabaseSchemaFlow = ai.defineFlow(
  {
    name: 'generateDatabaseSchemaFlow',
    inputSchema: GenerateDatabaseSchemaInputSchema,
    outputSchema: GenerateDatabaseSchemaOutputSchema,
  },
  async (input) => {
    const { output } = await generateDatabaseSchemaPrompt(input);
    if (!output) {
      throw new Error('Failed to generate database schemas.');
    }
    return output;
  }
);
