import { SearchResult } from './types';
import { googleSearch } from './google';

export type SearchProvider = 'google' | 'tavily';

/**
 * Unified search interface for AI research retrieval.
 */
export async function performSearch(
  query: string, 
  provider: SearchProvider = 'google'
): Promise<SearchResult> {
  console.log(`[SEARCH] Performing ${provider} search for: "${query}"`);
  
  if (provider === 'google') {
    return googleSearch(query);
  }
  
  // Tavily can be added here if needed in the future
  if (provider === 'tavily') {
    console.warn('[SEARCH] Tavily provider not yet implemented. Falling back to Google.');
    return googleSearch(query);
  }

  return { candidates: [] };
}
