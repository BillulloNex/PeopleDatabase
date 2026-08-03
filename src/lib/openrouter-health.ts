import { openrouter, OPENROUTER_MODELS } from './openrouter';

/**
 * Lightweight health check — sends a minimal prompt to verify OpenRouter credits are active.
 * Returns true if AI is working, false if credits are exhausted or API is down.
 * Cost: ~$0.00001 per check (trivial).
 */
export async function checkOpenRouterHealth(): Promise<{ healthy: boolean; error?: string }> {
  if (!process.env.OPENROUTER_API_KEY) {
    return { healthy: false, error: 'OPENROUTER_API_KEY not set' };
  }

  try {
    const response = await openrouter.chat.completions.create({
      model: OPENROUTER_MODELS.FAST_EXTRACTION,
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
      max_tokens: 5,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      return { healthy: false, error: 'Empty response from OpenRouter' };
    }
    return { healthy: true };
  } catch (err: any) {
    const status = err?.status || err?.statusCode;
    const message = err?.message || 'Unknown error';

    if (status === 402) {
      return { healthy: false, error: `💸 OpenRouter credits exhausted (402). Top up at https://openrouter.ai/credits` };
    }
    if (status === 401) {
      return { healthy: false, error: `🔑 OpenRouter API key invalid (401). Check OPENROUTER_API_KEY.` };
    }
    if (status === 429) {
      // Rate limited but account is active — proceed with caution
      return { healthy: true };
    }

    return { healthy: false, error: `OpenRouter health check failed: ${status || ''} ${message}` };
  }
}
