export interface SearchCandidate {
  title: string;
  link: string;
  snippet: string;
  source: string;
  price?: string;
  currency?: string;
  image?: string;
}

export interface SearchResult {
  candidates: SearchCandidate[];
  raw?: any;
  error?: string;
}
