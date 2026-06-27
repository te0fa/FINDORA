import { callAI } from '@/lib/ai/provider'

export interface ParsedRequest {
  category: 'electronics' | 'appliances' | 'automotive' | 'furniture' | 'services'
  productName: string
  targetLocation: string
  maxPrice: number | null
  notes: string
}

const SYSTEM_PROMPT = `
You are Findora's AI Buying Agent. Your job is to parse a customer's natural language sourcing request (in Arabic or English) and extract structured product requirements in JSON format.

JSON schema:
{
  "category": "electronics" | "appliances" | "automotive" | "furniture" | "services",
  "productName": "extracted product name in Arabic if request is in Arabic, or English",
  "targetLocation": "extracted city or region in Egypt (e.g. القاهرة, الجيزة, الإسكندرية). Default to 'القاهرة' if not specified",
  "maxPrice": number or null (extract budget if mentioned),
  "notes": "any additional specs like size, capacity, condition, or installation preference"
}

Categorization rules:
- 'electronics': mobiles, screens, laptops, tablets, chargers, cameras, tech accessories.
- 'appliances': air conditioners (تكييف), refrigerators, washers, ovens, home appliances.
- 'automotive': cars, tires, car parts, accessories.
- 'furniture': tables, chairs, decorations, home furniture.
- 'services': home finishing, maintenance, installations, carpentry.
`

export async function parseNaturalLanguageRequest(query: string): Promise<ParsedRequest> {
  if (!query || !query.trim()) {
    throw new Error('Query is empty')
  }

  const result = await callAI<ParsedRequest>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: `Parse this sourcing request: "${query}"`,
    jsonMode: true
  })

  if (result.error || !result.data) {
    throw new Error(result.error || 'Failed to parse request with AI')
  }

  // Ensure default fallback values to guarantee type-safety
  const data = result.data
  return {
    category: data.category || 'electronics',
    productName: data.productName || query.slice(0, 100),
    targetLocation: data.targetLocation || 'القاهرة',
    maxPrice: data.maxPrice ? Number(data.maxPrice) : null,
    notes: data.notes || ''
  }
}
