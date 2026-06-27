import { SearchResult } from './types';

/**
 * Google Custom Search Engine integration.
 * Requires GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_CX environment variables.
 */
export async function googleSearch(query: string): Promise<SearchResult> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX || process.env.GOOGLE_CSE_ID;

  if (!apiKey || !cx) {
    console.warn('[SEARCH] Google Search credentials missing.');
    return { 
      candidates: [],
      error: 'SEARCH_PROVIDER_MISSING_CONFIG: Google Search API Key or CX ID is not configured.'
    };
  }

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('[SEARCH] Google Search API error:', data.error);
      return { candidates: [] };
    }

    const candidates = (data.items || []).map((item: any) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      source: 'google',
      image: item.pagemap?.cse_image?.[0]?.src || item.pagemap?.metatags?.[0]?.['og:image']
    }));

    return { candidates, raw: data };
  } catch (err) {
    console.error('[SEARCH] Google Search fetch failed:', err);
    return { candidates: [] };
  }
}
