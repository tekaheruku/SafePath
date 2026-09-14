import OpenAI from 'openai';

let client: OpenAI | null = null;

// Points at a local Ollama server (OpenAI-compatible /v1 API), not OpenAI's hosted API.
export function getLlmClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      baseURL: process.env.LOCAL_LLM_BASE_URL || 'http://localhost:11434/v1',
      apiKey: 'ollama', // ignored by Ollama, but the SDK requires a non-empty string
      timeout: 30_000,
    });
  }
  return client;
}

export function getLlmModel(): string {
  return process.env.LOCAL_LLM_MODEL || 'llama3.2:3b';
}
