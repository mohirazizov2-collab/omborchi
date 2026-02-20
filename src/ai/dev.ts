
import { config } from 'dotenv';
config();

// Barcha AI oqimlarini (flows) import qilish
import '@/ai/flows/analyze-reports-flow';
import '@/ai/flows/generate-database-schema';
import '@/ai/flows/generate-backend-project-structure';
import '@/ai/flows/generate-backend-api-boilerplate';
