'use server';
/**
 * @fileOverview A Genkit flow for generating backend API boilerplate code, including API endpoint lists and NestJS controller/service examples for OmniStock.
 *
 * - generateBackendApiBoilerplate - A function that triggers the generation of backend API boilerplate.
 * - GenerateBackendAPIBoilerplateInput - The input type for the generateBackendApiBoilerplate function (currently an empty object).
 * - GenerateBackendAPIBoilerplateOutput - The return type for the generateBackendApiBoilerplate function, containing API endpoints and boilerplate code.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBackendAPIBoilerplateInputSchema = z
  .object({})
  .describe('Input schema for generating backend API boilerplate. Currently an empty object.');
export type GenerateBackendAPIBoilerplateInput = z.infer<
  typeof GenerateBackendAPIBoilerplateInputSchema
>;

const GenerateBackendAPIBoilerplateOutputSchema = z.object({
  apiEndpoints: z
    .string()
    .describe(
      'A markdown-formatted list of core API endpoints for OmniStock, including HTTP method, path, and a brief description.'
    ),
  warehouseControllerExample: z
    .string()
    .describe(
      'A boilerplate NestJS TypeScript controller example for managing warehouses, including basic CRUD operations using DTOs.'
    ),
  warehouseServiceExample: z
    .string()
    .describe(
      'A boilerplate NestJS TypeScript service example for managing warehouses, interacting with a hypothetical Prisma client.'
    ),
  productControllerExample: z
    .string()
    .describe(
      'A boilerplate NestJS TypeScript controller example for managing products, including basic CRUD operations and specific product-related actions like barcode handling.'
    ),
  productServiceExample: z
    .string()
    .describe(
      'A boilerplate NestJS TypeScript service example for managing products, interacting with a hypothetical Prisma client and handling product-specific logic.'
    ),
  stockMovementControllerExample: z
    .string()
    .describe(
      'A boilerplate NestJS TypeScript controller example for managing all stock movements (goods receipt, issue, transfer), with appropriate endpoints and DTOs.'
    ),
  stockMovementServiceExample: z
    .string()
    .describe(
      'A boilerplate NestJS TypeScript service example for managing all stock movements (goods receipt, issue, transfer), ensuring transactional integrity and stock level updates.'
    ),
});
export type GenerateBackendAPIBoilerplateOutput = z.infer<
  typeof GenerateBackendAPIBoilerplateOutputSchema
>;

const generateBackendApiBoilerplatePrompt = ai.definePrompt({
  name: 'generateBackendApiBoilerplatePrompt',
  input: {schema: GenerateBackendAPIBoilerplateInputSchema},
  output: {schema: GenerateBackendAPIBoilerplateOutputSchema},
  prompt: `You are an expert Senior Backend Developer specializing in NestJS, TypeScript, and Prisma.
Your task is to generate boilerplate code and API endpoint documentation for the core backend features of the OmniStock inventory management system.
The system needs to manage warehouses, products, and all stock-related operations (goods receipt, goods issue, inter-warehouse transfers).
Follow NestJS best practices, use DTOs for input validation, and assume a Prisma ORM is used for database interactions.
Ensure all generated code is production-ready, clean, modular, and follows a clean separation of concerns.

Generate the following:

1.  **API Endpoints List**: A markdown-formatted list of API endpoints for managing warehouses, products, and stock movements. Include the HTTP method, the endpoint path, and a brief description for each.
2.  **Warehouse Management**:
    *   A boilerplate NestJS TypeScript controller for 'Warehouse' entity. Include methods for 'create', 'findAll', 'findOne', 'update', and 'softDelete'. Use appropriate DTOs.
    *   A boilerplate NestJS TypeScript service for 'Warehouse' entity. Include methods matching the controller actions, interacting with a hypothetical 'PrismaService'.
3.  **Product Management**:
    *   A boilerplate NestJS TypeScript controller for 'Product' entity. Include methods for 'create', 'findAll', 'findOne', 'update', 'softDelete', and 'findBySKUOrBarcode'. Use appropriate DTOs.
    *   A boilerplate NestJS TypeScript service for 'Product' entity. Include methods matching the controller actions, interacting with a hypothetical 'PrismaService'. Handle unique SKU and optional barcode.
4.  **Stock Movement Operations**: This should cover Goods Receipt (Stock In), Goods Issue (Stock Out), and Inter-Warehouse Transfers.
    *   A boilerplate NestJS TypeScript controller for 'StockMovement' operations. Include endpoints for 'recordGoodsReceipt', 'recordGoodsIssue', and 'initiateTransfer'. Use appropriate DTOs for each operation, ensuring all necessary fields (e.g., 'delivery_note_number', 'warehouse_id', 'product_id', 'quantity') are covered.
    *   A boilerplate NestJS TypeScript service for 'StockMovement' operations. Include methods matching the controller actions. These methods must demonstrate transactional integrity (e.g., 'PrismaService.$transaction'), update stock balances, and record 'stock_movements' and 'audit_logs'. Ensure checks for sufficient stock for issues and transfers.

Each code example should be a complete, runnable snippet where possible, including necessary imports and class decorators.
Assume the existence of 'PrismaService' and appropriate DTOs (e.g., 'CreateWarehouseDto', 'UpdateWarehouseDto', 'CreateProductDto', 'RecordGoodsReceiptDto', 'RecordGoodsReceiptItemDto', 'RecordGoodsIssueDto', 'InitiateTransferDto', 'TransferItemDto').`,
});

export async function generateBackendApiBoilerplate(
  input: GenerateBackendAPIBoilerplateInput
): Promise<GenerateBackendAPIBoilerplateOutput> {
  return generateBackendApiBoilerplateFlow(input);
}

const generateBackendApiBoilerplateFlow = ai.defineFlow(
  {
    name: 'generateBackendApiBoilerplateFlow',
    inputSchema: GenerateBackendAPIBoilerplateInputSchema,
    outputSchema: GenerateBackendAPIBoilerplateOutputSchema,
  },
  async input => {
    const {output} = await generateBackendApiBoilerplatePrompt(input);
    return output!;
  }
);
