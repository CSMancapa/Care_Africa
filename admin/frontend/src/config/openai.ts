import { z } from 'zod';

const envSchema = z.object({
  VITE_OPENAI_API_KEY: z.string().min(1),
  VITE_OPENAI_MODEL: z.string().default('gpt-4-turbo-preview'),
});

const env = envSchema.parse({
  VITE_OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  VITE_OPENAI_MODEL: import.meta.env.VITE_OPENAI_MODEL,
});

export const config = {
  apiKey: env.VITE_OPENAI_API_KEY,
  model: env.VITE_OPENAI_MODEL,
} as const;