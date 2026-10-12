import { genkit, z } from 'genkit';
import openAI from 'genkitx-openai';

const modelName = process.env.TOKENROUTER_MODEL || 'gpt-4o-mini';

export const ai = genkit({
  plugins: [
    openAI({
      apiKey: process.env.TOKENROUTER_API_KEY,
      baseURL: 'https://api.tokenrouter.com/v1',
      models: [{
        name: modelName,
        info: {
          versions: [modelName],
          label: `TokenRouter - ${modelName}`,
          supports: {
            multiturn: true,
            tools: true,
            media: false,
            systemRole: true,
            output: ['text', 'json'],
          },
        },
        configSchema: z.object({}),
      }],
    }),
  ],
  model: `openai/${modelName}`,
});

export const model = `openai/${modelName}`;
