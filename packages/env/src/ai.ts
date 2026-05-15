import { z } from "zod";

export const aiEnv = z.object({
    OLLAMA_BASE_URL: z.string().url().default("http://192.168.1.180:11434"),
    OLLAMA_MODEL: z.string().default("llama3.2"),
});

export type AiEnv = z.infer<typeof aiEnv>;
