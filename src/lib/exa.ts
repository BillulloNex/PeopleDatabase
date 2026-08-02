import Exa from 'exa-js';

const exaApiKey = process.env.EXA_API_KEY || '';
export const exa = exaApiKey ? new Exa(exaApiKey) : null;

export interface ExaProfileResult {
  title: string;
  url: string;
  author?: string;
  publishedDate?: string;
  text?: string;
}

/**
 * Searches Exa.ai for people matching natural language query (e.g. "founders of AI startups in SF").
 */
export async function searchPeopleWithExa(query: string, numResults: number = 10): Promise<ExaProfileResult[]> {
  if (!exa) {
    console.warn('[Exa.ai] EXA_API_KEY is missing. Returning empty discovery results.');
    return [];
  }

  try {
    const result = await exa.searchAndContents(query, {
      type: 'neural',
      useAutoprompt: true,
      numResults,
      text: { maxCharacters: 4000 }
    });

    return result.results.map((item) => ({
      title: item.title || '',
      url: item.url,
      author: item.author || undefined,
      publishedDate: item.publishedDate || undefined,
      text: item.text
    }));
  } catch (err) {
    console.error('[Exa.ai] Neural search error:', err);
    return [];
  }
}

/**
 * Discovers similar people profile URLs given an existing profile URL using Exa /findSimilar.
 */
export async function findSimilarProfilesWithExa(profileUrl: string, numResults: number = 10): Promise<ExaProfileResult[]> {
  if (!exa) {
    console.warn('[Exa.ai] EXA_API_KEY is missing.');
    return [];
  }

  try {
    const result = await exa.findSimilarAndContents(profileUrl, {
      numResults,
      text: { maxCharacters: 4000 }
    });

    return result.results.map((item) => ({
      title: item.title || '',
      url: item.url,
      author: item.author || undefined,
      text: item.text
    }));
  } catch (err) {
    console.error('[Exa.ai] FindSimilar error for URL:', profileUrl, err);
    return [];
  }
}
