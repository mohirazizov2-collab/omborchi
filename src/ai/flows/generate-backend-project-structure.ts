'use server';
/**
 * @fileOverview A Genkit flow for generating a recommended NestJS backend project structure.
 *
 * - generateBackendProjectStructure - A function that handles the generation process.
 * - GenerateBackendProjectStructureInput - The input type for the generateBackendProjectStructure function.
 * - GenerateBackendProjectStructureOutput - The return type for the generateBackendProjectStructure function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBackendProjectStructureInputSchema = z.object({
  projectName: z
    .string()
    .optional()
    .describe('The name of the project, used to tailor the structure slightly.'),
});
export type GenerateBackendProjectStructureInput = z.infer<
  typeof GenerateBackendProjectStructureInputSchema
>;

const GenerateBackendProjectStructureOutputSchema = z.object({
  folderStructure: z.string().describe('The recommended NestJS folder structure.'),
});
export type GenerateBackendProjectStructureOutput = z.infer<
  typeof GenerateBackendProjectStructureOutputSchema
>;

export async function generateBackendProjectStructure(
  input: GenerateBackendProjectStructureInput
): Promise<GenerateBackendProjectStructureOutput> {
  return generateBackendProjectStructureFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateBackendProjectStructurePrompt',
  input: {schema: GenerateBackendProjectStructureInputSchema},
  output: {schema: GenerateBackendProjectStructureOutputSchema},
  prompt: `You are an expert backend architect. Your task is to design a robust and maintainable NestJS backend project structure, strictly following Clean Architecture principles and emphasizing modularity.

The project is named '{{{projectName}}}' (if provided, otherwise use 'OmniStock'). It is an inventory management system with the following core features:

- Warehouse & Product Management (create, update, soft-delete warehouses and products, SKUs, categories, low-stock thresholds)
- Stock Movement Operations (goods receipts, goods issues, inter-warehouse transfers, real-time stock checks, transaction logging)
- User & Access Management (JWT authentication, role-based access control for Admin, Warehouse Manager, Operator roles, audit trail)
- Advanced Reporting & Analytics (stock balance, movement history, low-stock products, best sellers, filtering, PDF/Excel export)

Consider the following requirements when generating the structure:
- **Clean Architecture:** Separate concerns into layers (e.g., Domain, Application, Infrastructure, Presentation).
- **Modularity:** Each major feature or domain should be a distinct module.
- **NestJS Best Practices:** Adhere to common NestJS project conventions.
- **SOLID Principles:** Structure the code to support these principles.
- **DTO Validation:** Include DTOs for request validation.
- **Centralized Error Handling:** Consider where global exception filters would reside.
- **Logging:** Where logging middleware or services would fit.

Generate the folder structure as a clear, multi-line text representation. Use indentation to show nested directories. For example:

src/
  ├── main.ts
  ├── app.module.ts
  ├── common/
  │   ├── filters/
  │   ├── interceptors/
  │   └── pipes/
  └── module-name/
      ├── application/
      │   ├── use-cases/
      │   └── dtos/
      ├── domain/
      │   ├── entities/
      │   └── interfaces/
      ├── infrastructure/
      │   ├── persistence/
      │   ├── providers/
      │   └── controllers/
      └── module-name.module.ts

Focus on the logical separation and give appropriate names for folders and key files.

Output ONLY the JSON object with the 'folderStructure' field.`,
});

const generateBackendProjectStructureFlow = ai.defineFlow(
  {
    name: 'generateBackendProjectStructureFlow',
    inputSchema: GenerateBackendProjectStructureInputSchema,
    outputSchema: GenerateBackendProjectStructureOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
