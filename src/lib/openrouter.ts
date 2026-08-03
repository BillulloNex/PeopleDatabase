import OpenAI from 'openai';

// Initialize OpenAI client configured for OpenRouter
export const openrouter = new OpenAI({
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || 'sk-or-mock-key',
  defaultHeaders: {
    'HTTP-Referer': 'https://people.beenex.org',
    'X-Title': 'PeopleDatabase Global Intelligence Engine',
  },
});

export const OPENROUTER_MODELS = {
  FAST_EXTRACTION: process.env.MODEL_FAST || 'openai/gpt-5.6-luna',
  REASONING_RESOLVER: process.env.MODEL_REASONING || 'openai/gpt-5.6-luna',
};

export interface ExtractedPersonProfile {
  fullName: string;
  headline?: string;
  bio?: string;
  location?: string;
  emails: string[];
  phones?: string[];
  company?: string;
  title?: string;
  skills: string[];
  socialLinks: { platform: string; url: string; handle?: string }[];
  languages?: string[];
}

/**
 * Uses GPT-5.6 Luna via OpenRouter to extract clean structured Person profiles from unstructured text/HTML.
 */
export async function extractPersonProfileWithAI(rawText: string, sourceUrl: string): Promise<ExtractedPersonProfile> {
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn('[OpenRouter] OPENROUTER_API_KEY missing. Falling back to heuristic extraction.');
    return fallbackExtraction(rawText, sourceUrl);
  }

  try {
    const prompt = `Extract all person details from the following web text/source (${sourceUrl}). 

CRITICAL GUARDRAILS:
- ONLY extract social links (LinkedIn, Twitter/X, GitHub, Website) that are EXPLICITLY present as real, verbatim URLs in the source content below.
- NEVER invent, guess, or hallucinate social profile URLs or handles if they are not explicitly in the text.
- If a social link is not found in the source text, omit it from socialLinks.

Return JSON matching the schema:
{
  "fullName": string,
  "headline": string,
  "bio": string,
  "location": string,
  "emails": string[],
  "phones": string[],
  "company": string,
  "title": string,
  "skills": string[],
  "socialLinks": [{"platform": string, "url": string, "handle": string}]
}

Source Content:
${rawText.slice(0, 10000)}`;

    let attempts = 0;
    let response: any;

    while (attempts < 4) {
      try {
        attempts++;
        response = await openrouter.chat.completions.create({
          model: OPENROUTER_MODELS.FAST_EXTRACTION,
          messages: [
            { role: 'system', content: 'You are an expert AI entity extractor. Extract precise person profiles in valid JSON. Never hallucinate URLs.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        });
        break;
      } catch (err: any) {
        if (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('rate limit')) {
          const waitTime = Math.pow(2, attempts) * 1000;
          console.warn(`[OpenRouter] Rate limited (429). Retrying in ${waitTime}ms (Attempt ${attempts}/4)...`);
          await new Promise(res => setTimeout(res, waitTime));
        } else {
          throw err;
        }
      }
    }

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty AI response');
    const result = JSON.parse(content) as ExtractedPersonProfile;
    (result as any)._extractionMethod = 'ai-luna';
    return result;
  } catch (err) {
    const status = (err as any)?.status;
    // Only fall back for transient errors, NOT for payment/auth failures
    if (status === 402 || status === 401) {
      throw new Error(`[OpenRouter] FATAL: API returned ${status}. Aborting to prevent garbage ingestion.`);
    }
    console.error('[OpenRouter] AI extraction failed, fallback triggered:', err);
    return fallbackExtraction(rawText, sourceUrl);
  }
}

/**
 * Uses GPT-5.6 Terra via OpenRouter to resolve ambiguous profile duplicate candidates.
 */
export async function evaluateEntityMergeWithAI(
  existingProfile: Record<string, any>,
  newProfile: ExtractedPersonProfile
): Promise<{ shouldMerge: boolean; confidenceScore: number; reason: string }> {
  if (!process.env.OPENROUTER_API_KEY) {
    return { shouldMerge: false, confidenceScore: 0.5, reason: 'No OpenRouter API key provided' };
  }

  try {
    const prompt = `Compare these two profile records and determine if they belong to the SAME PHYSICAL INDIVIDUAL.
Existing Entity: ${JSON.stringify(existingProfile)}
New Discovered Profile: ${JSON.stringify(newProfile)}

Respond with JSON:
{
  "shouldMerge": boolean,
  "confidenceScore": number (0.0 to 1.0),
  "reason": string
}`;

    const response = await openrouter.chat.completions.create({
      model: OPENROUTER_MODELS.REASONING_RESOLVER,
      messages: [
        { role: 'system', content: 'You are a master identity resolution AI. Evaluate entity equivalence.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty resolution response');
    return JSON.parse(content);
  } catch (err) {
    console.error('[OpenRouter] Entity resolution evaluation failed:', err);
    return { shouldMerge: false, confidenceScore: 0, reason: 'AI reasoning error' };
  }
}

function fallbackExtraction(text: string, sourceUrl: string): ExtractedPersonProfile {
  const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const uniqueEmails = Array.from(new Set(emails));
  const urlParts = sourceUrl.split('/');
  const possibleName = urlParts[urlParts.length - 1] || 'Discovered Person';

  return {
    fullName: possibleName.replace(/[-_]/g, ' '),
    emails: uniqueEmails,
    bio: text.slice(0, 300),
    skills: [],
    socialLinks: [{ platform: 'web', url: sourceUrl }],
    _extractionMethod: 'heuristic-fallback',
  } as ExtractedPersonProfile & { _extractionMethod: string };
}

/**
 * Evaluates multiple candidates against a new profile in a single LLM call.
 * Returns the best match (if any) with confidence > threshold.
 */
export async function evaluateBatchEntityMerge(
  candidates: Record<string, any>[],
  newProfile: ExtractedPersonProfile
): Promise<{ matchIndex: number; shouldMerge: boolean; confidenceScore: number; reason: string }> {
  if (!process.env.OPENROUTER_API_KEY || candidates.length === 0) {
    return { matchIndex: -1, shouldMerge: false, confidenceScore: 0, reason: 'No candidates' };
  }

  const candidateList = candidates
    .map((c, i) => `Candidate ${i}: ${JSON.stringify({ fullName: c.fullName, company: c.currentCompany, title: c.currentTitle, emails: c.emails, location: c.location })}`)
    .join('\n');

  const prompt = `Compare this new profile against ${candidates.length} existing candidates. Determine which (if any) is the SAME PHYSICAL INDIVIDUAL.

New Profile: ${JSON.stringify({ fullName: newProfile.fullName, company: newProfile.company, title: newProfile.title, emails: newProfile.emails, location: newProfile.location })}

${candidateList}

Respond with JSON:
{
  "matchIndex": number (-1 if no match),
  "shouldMerge": boolean,
  "confidenceScore": number (0.0 to 1.0),
  "reason": string
}`;

  try {
    const response = await openrouter.chat.completions.create({
      model: OPENROUTER_MODELS.REASONING_RESOLVER,
      messages: [
        { role: 'system', content: 'You are a master identity resolution AI. Find the matching candidate or report no match.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty batch resolution response');
    return JSON.parse(content);
  } catch (err) {
    console.error('[OpenRouter] Batch entity resolution failed:', err);
    return { matchIndex: -1, shouldMerge: false, confidenceScore: 0, reason: 'AI batch error' };
  }
}
