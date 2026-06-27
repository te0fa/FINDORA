import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function getGeminiModel() {
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
  return genAI.getGenerativeModel({ 
    model: modelName,
    tools: [
      {
        googleSearchRetrieval: {},
      },
    ] as any, // Cast as any because the SDK types might be behind the grounding feature
  })
}

export interface ResearchResult {
  summary: string
  findings: Array<{
    title: string
    url: string
    snippet: string
    relevance_score: number
  }>
}

export async function runGroundedResearch(prompt: string): Promise<ResearchResult> {
  const model = await getGeminiModel()
  
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          findings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                url: { type: 'string' },
                snippet: { type: 'string' },
                relevance_score: { type: 'number' }
              },
              required: ['title', 'url', 'snippet']
            }
          }
        },
        required: ['summary', 'findings']
      } as any
    }
  })

  const response = await result.response
  const text = response.text()
  return JSON.parse(text)
}

export interface AnalyzedQuote {
  quote_id: string
  match_score: number
  rating_stars: number
  advantages_en: string
  advantages_ar: string
  verdict_en: string
  verdict_ar: string
  rank: number
}

export interface SourcingAnalysisResult {
  analysis_summary: string
  analyzed_quotes: AnalyzedQuote[]
}

export async function analyzeQuotesWithGemini(
  searchTerm: string,
  category: string,
  budget: number,
  quotes: any[]
): Promise<SourcingAnalysisResult> {
  const model = await getGeminiModel()
  
  const prompt = `
Analyze the following online price quotes collected for the user search query: "${searchTerm}" under category "${category}" with a budget of ${budget} EGP.
Evaluate each quote, score its compatibility (0-100) based on title relevance and price value, assign a star rating (0.0 to 5.0), compile a list of advantages/pros in English and Arabic, provide a brief verdict/decision in English and Arabic, and rank the offers from best (1) to worst.

Quotes list:
${JSON.stringify(quotes.map(q => ({ id: q.id, store_name: q.store_name, title: q.title, price: q.price, url: q.product_url })), null, 2)}

Provide the output in JSON format matching the schema rules.
  `

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          analysis_summary: { type: 'string' },
          analyzed_quotes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                quote_id: { type: 'string' },
                match_score: { type: 'number' },
                rating_stars: { type: 'number' },
                advantages_en: { type: 'string' },
                advantages_ar: { type: 'string' },
                verdict_en: { type: 'string' },
                verdict_ar: { type: 'string' },
                rank: { type: 'number' }
              },
              required: ['quote_id', 'match_score', 'rating_stars', 'advantages_en', 'advantages_ar', 'verdict_en', 'verdict_ar', 'rank']
            }
          }
        },
        required: ['analysis_summary', 'analyzed_quotes']
      } as any
    }
  })

  const response = await result.response
  const text = response.text()
  return JSON.parse(text)
}

export async function analyzeOfflineQuotesWithGemini(
  searchTerm: string,
  category: string,
  budget: number,
  quotes: any[]
): Promise<SourcingAnalysisResult> {
  const model = await getGeminiModel()
  
  const prompt = `
Analyze the following offline merchant quotes collected by field scouts for: "${searchTerm}" under category "${category}" with a budget of ${budget} EGP.
Evaluate each quote, score its compatibility (0-100), assign a star rating (0.0 to 5.0), compile a list of advantages/pros in English and Arabic, provide a brief verdict/decision in English and Arabic, and rank the offers from best (1) to worst.

Quotes list:
${JSON.stringify(quotes.map(q => ({ id: q.id, merchant_name: q.merchant_name, title: q.product_title, price: q.price_amount, notes: q.notes, governorate: q.governorate, area: q.area })), null, 2)}

Provide the output in JSON format matching the schema rules.
  `

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          analysis_summary: { type: 'string' },
          analyzed_quotes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                quote_id: { type: 'string' },
                match_score: { type: 'number' },
                rating_stars: { type: 'number' },
                advantages_en: { type: 'string' },
                advantages_ar: { type: 'string' },
                verdict_en: { type: 'string' },
                verdict_ar: { type: 'string' },
                rank: { type: 'number' }
              },
              required: ['quote_id', 'match_score', 'rating_stars', 'advantages_en', 'advantages_ar', 'verdict_en', 'verdict_ar', 'rank']
            }
          }
        },
        required: ['analysis_summary', 'analyzed_quotes']
      } as any
    }
  })

  const response = await result.response
  const text = response.text()
  return JSON.parse(text)
}

export interface SynthesizedDeal {
  source_type: 'online' | 'offline'
  quote_id: string
  deal_title: string
  merchant_name: string
  price: number
  product_url?: string
  match_score: number
  rating_stars: number
  advantages_en: string
  advantages_ar: string
  disadvantages_en: string
  disadvantages_ar: string
  rank: number
}

export interface SynthesisProposalResult {
  synthesis_summary: string
  top_deals: SynthesizedDeal[]
}

export async function synthesizeFinalProposalWithGemini(
  searchTerm: string,
  category: string,
  budget: number,
  onlineQuotes: any[],
  offlineQuotes: any[]
): Promise<SynthesisProposalResult> {
  const model = await getGeminiModel()
  
  const prompt = `
Analyze the combined list of online and offline price quotes collected for the user request: "${searchTerm}" (Category: "${category}", Budget: ${budget} EGP).
Your task is to select the TOP 5 absolute best deals overall. Compare them by price value, availability, features, warranty, installments, and authenticity.

For each of the selected top 5 deals, generate:
1. Matching compatibility score (0-100)
2. Star rating (0.0 to 5.0)
3. Advantages (Pros) in English and Arabic
4. Disadvantages (Cons/Drawbacks) in English and Arabic
5. Rank (1 to 5)

Online quotes:
${JSON.stringify(onlineQuotes.map(q => ({ id: q.id, store_name: q.store_name, title: q.title, price: q.price, url: q.product_url })), null, 2)}

Offline quotes:
${JSON.stringify(offlineQuotes.map(q => ({ id: q.id, merchant_name: q.merchant_name, title: q.product_title, price: q.price_amount, notes: q.notes, governorate: q.governorate, area: q.area })), null, 2)}

Provide the output in JSON format matching the schema rules.
  `

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          synthesis_summary: { type: 'string' },
          top_deals: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                source_type: { type: 'string', enum: ['online', 'offline'] },
                quote_id: { type: 'string' },
                deal_title: { type: 'string' },
                merchant_name: { type: 'string' },
                price: { type: 'number' },
                product_url: { type: 'string' },
                match_score: { type: 'number' },
                rating_stars: { type: 'number' },
                advantages_en: { type: 'string' },
                advantages_ar: { type: 'string' },
                disadvantages_en: { type: 'string' },
                disadvantages_ar: { type: 'string' },
                rank: { type: 'number' }
              },
              required: ['source_type', 'quote_id', 'deal_title', 'merchant_name', 'price', 'match_score', 'rating_stars', 'advantages_en', 'advantages_ar', 'disadvantages_en', 'disadvantages_ar', 'rank']
            }
          }
        },
        required: ['synthesis_summary', 'top_deals']
      } as any
    }
  })

  const response = await result.response
  const text = response.text()
  return JSON.parse(text)
}

import { getAIFeatureStatus, logAIFeatureUsage } from '@/lib/dal/ai-control'

export async function generateRfqDocument(
  productName: string,
  category: string,
  notes: string,
  companyName: string,
  crNumber: string,
  taxNumber: string,
  quantity: string
): Promise<string> {
  const fallbackText = `
# Request for Quote (RFQ)
- **Product**: ${productName}
- **Quantity**: ${quantity}
- **Company**: ${companyName}
- **CR**: ${crNumber}
- **Tax ID**: ${taxNumber}
- **Notes**: ${notes}
  `.trim()

  try {
    const status = await getAIFeatureStatus('flag_ai_rfq_generation')
    if (!status.enabled) {
      await logAIFeatureUsage({
        featureKey: 'flag_ai_rfq_generation',
        success: false,
        errorMessage: status.reason || 'Disabled'
      })
      return `[تنبيه: محرك الذكاء الاصطناعي معطّل أو تجاوز الحد] تم استخدام القالب الأساسي.\n\n${fallbackText}`
    }

    const model = await getGeminiModel()
    const prompt = `
Generate a professional, structured B2B RFQ (Request for Quote) document in Markdown format based on the following requirements:
- Product/Service Name: ${productName}
- Category: ${category}
- Required Quantity: ${quantity}
- Company Name: ${companyName}
- Commercial Register (CR): ${crNumber}
- Tax Registration Number: ${taxNumber}
- Additional Notes & Details: ${notes}

The document should be bilingual (Arabic & English), clean, and well-structured. It should include:
1. Executive Summary / الملخص التنفيذي
2. Technical Specifications / المواصفات الفنية
3. Commercial Terms & Delivery / الشروط التجارية والتسليم
4. Bidding Instructions for Suppliers / تعليمات تقديم العروض للتجار

Make it read like a premium, professional corporate RFQ. Do not output anything other than the Markdown document content itself.
`
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    })
    const response = await result.response
    const text = response.text()

    await logAIFeatureUsage({
      featureKey: 'flag_ai_rfq_generation',
      success: true,
      estimatedCost: 0.01
    })

    return text
  } catch (error: any) {
    console.error('Error generating RFQ document with Gemini:', error)
    await logAIFeatureUsage({
      featureKey: 'flag_ai_rfq_generation',
      success: false,
      errorMessage: error.message || String(error)
    })
    return fallbackText
  }
}

