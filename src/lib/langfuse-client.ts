/**
 * Langfuse Client for LLM Observability
 * 
 * Tracks prompts, completions, and evaluations for research brief generation
 */

import { Langfuse } from 'langfuse';

let langfuseClient: Langfuse | null = null;

/**
 * Get or create Langfuse client instance
 */
export function getLangfuseClient(): Langfuse | null {
  // Only initialize if environment variables are set
  if (!process.env.LANGFUSE_SECRET_KEY || !process.env.LANGFUSE_PUBLIC_KEY) {
    console.warn('⚠️  Langfuse not configured - skipping observability');
    return null;
  }

  if (!langfuseClient) {
    langfuseClient = new Langfuse({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
    });
  }

  return langfuseClient;
}

/**
 * Flush pending events (call before serverless function ends)
 */
export async function flushLangfuse() {
  if (langfuseClient) {
    await langfuseClient.flushAsync();
  }
}
