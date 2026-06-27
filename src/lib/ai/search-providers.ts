/**
 * AI Copilot runs on-demand for the current request only. 
 * It must not batch-process all requests unless a future admin-approved batch job explicitly allows it.
 * research_retriever remains disabled until Batch 7C.
 */
import { googleSearch } from '../search/google';
import { createLogger } from '@/lib/utils/logger'
const log = createLogger('ai/search-providers')

export interface NormalizedSearchCandidate {
  title: string;
  url: string;
  snippet: string;
  provider: string;
  rank: number;
  domain: string;
  retrievedAt: string;
  image?: string;
}

export interface SearchProviderResponse {
  candidates: NormalizedSearchCandidate[];
  error?: string;
}

/**
 * Tavily Search Provider Adapter
 */
export async function searchTavily(query: string, options: any = {}): Promise<SearchProviderResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return { candidates: [], error: 'SEARCH_PROVIDER_MISSING_CONFIG: Tavily API Key missing.' };
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: Math.min(options.maxResults || 5, 10),
        include_images: true
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Tavily API responded with ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    
    const candidates = (data.results || []).map((res: any, idx: number) => ({
      title: res.title,
      url: res.url,
      snippet: res.content,
      provider: 'tavily',
      rank: idx + 1,
      domain: res.url ? new URL(res.url).hostname : 'unknown',
      retrievedAt: new Date().toISOString(),
      image: res.image
    }));

    return { candidates };
  } catch (err: any) {
    log.error('[SEARCH_TAVILY] Error:', err.message);
    return { candidates: [], error: `SEARCH_ERROR: Tavily failed: ${err.message}` };
  }
}

/**
 * Brave Search Provider Adapter
 */
export async function searchBrave(query: string, options: any = {}): Promise<SearchProviderResponse> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    return { candidates: [], error: 'SEARCH_PROVIDER_MISSING_CONFIG: Brave Search API Key missing.' };
  }

  try {
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${Math.min(options.maxResults || 5, 10)}`, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Brave Search API responded with ${response.status}`);
    }

    const data = await response.json();

    const candidates = (data.web?.results || []).map((res: any, idx: number) => ({
      title: res.title,
      url: res.url,
      snippet: res.description,
      provider: 'brave',
      rank: idx + 1,
      domain: res.url ? new URL(res.url).hostname : 'unknown',
      retrievedAt: new Date().toISOString()
    }));

    return { candidates };
  } catch (err: any) {
    log.error('[SEARCH_BRAVE] Error:', err.message);
    return { candidates: [], error: `SEARCH_ERROR: Brave failed: ${err.message}` };
  }
}

/**
 * Universal Search Provider Runner
 */
export async function runSearchProvider(provider: string, query: string, options: any = {}): Promise<SearchProviderResponse> {
  if (provider === 'google_custom_search') {
    const res = await googleSearch(query);
    if (res.error) return { candidates: [], error: res.error };
    
    return {
      candidates: res.candidates.map((c, idx) => ({
        title: c.title,
        url: c.link,
        snippet: c.snippet,
        provider: 'google',
        rank: idx + 1,
        domain: c.link ? new URL(c.link).hostname : 'unknown',
        retrievedAt: new Date().toISOString(),
        image: c.image
      }))
    };
  }

  if (provider === 'tavily') {
    return searchTavily(query, options);
  }

  if (provider === 'brave_search') {
    return searchBrave(query, options);
  }

  if (provider === 'gemini_analysis_only') {
     return { candidates: [], error: 'SEARCH_PROVIDER_DISABLED: Gemini analysis only mode active.' };
  }

  return { candidates: [], error: `SEARCH_PROVIDER_UNKNOWN: ${provider}` };
}
