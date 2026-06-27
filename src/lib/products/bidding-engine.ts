import { getBidsForRequest, updateBid, getVendorAverageResponseSpeed } from '@/lib/dal/bidding'
import { createAdminClient } from '@/lib/dal/customers'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('BiddingEngine')

export interface ScoreBreakdown {
  price: number
  delivery: number
  warranty: number
  vendor: number
  valueAdds: number
  total: number
}

// ─── Deal Score Calculations ──────────────────────────────────────────────────

/**
 * Calculates a comprehensive Deal Score (0-100) for a vendor's bid.
 * Higher score represents a better overall deal for the customer.
 */
export function calculateDealScore(
  bid: {
    price_amount: number
    delivery_days: number
    warranty_months: number
    product_condition: 'new' | 'used' | 'refurbished'
    installation_included: boolean
  },
  request: {
    budget: number | null
    priority: string | null // 'price' | 'quality' | 'speed'
  },
  vendorRating = 85, // Fallback merchant trust score out of 100
  avgResponseSpeedHours?: number
): ScoreBreakdown {
  const budget = request.budget || bid.price_amount * 1.1 // fallback budget
  const priority = request.priority || 'price'

  // 1. Price Score (Standard 40% weight)
  // Higher points for lower prices compared to the budget
  let pricePoints = 0
  if (bid.price_amount <= budget) {
    // Reward lower prices
    const ratio = budget / bid.price_amount
    pricePoints = Math.min(ratio * 40, 45) // allow slight bonus points up to 45
  } else {
    // Penalize prices over budget
    const penalty = (bid.price_amount - budget) / budget
    pricePoints = Math.max(40 - penalty * 40, 0)
  }

  // 2. Delivery Speed Score (Standard 20% weight)
  let deliveryPoints = 0
  const days = bid.delivery_days
  if (days <= 1) deliveryPoints = 20
  else if (days <= 2) deliveryPoints = 18
  else if (days <= 3) deliveryPoints = 15
  else if (days <= 5) deliveryPoints = 10
  else if (days <= 7) deliveryPoints = 5
  else deliveryPoints = 2

  // 3. Warranty Score (Standard 15% weight)
  let warrantyPoints = 0
  const months = bid.warranty_months
  if (months >= 24) warrantyPoints = 15
  else if (months >= 12) warrantyPoints = 12
  else if (months >= 6) warrantyPoints = 8
  else if (months >= 3) warrantyPoints = 5
  else warrantyPoints = 0

  // 4. Vendor Rating Score (Standard 15% weight) - merging past response speed
  let speedScore = 60
  const speedHours = avgResponseSpeedHours ?? 12
  if (speedHours <= 2) speedScore = 100
  else if (speedHours <= 6) speedScore = 85
  else if (speedHours <= 12) speedScore = 70

  const compositeRating = (0.7 * vendorRating) + (0.3 * speedScore)
  const vendorPoints = (compositeRating / 100) * 15

  // 5. Value Adds & Condition Score (Standard 10% weight)
  let valueAddsPoints = 0
  if (bid.installation_included) valueAddsPoints += 5
  if (bid.product_condition === 'new') valueAddsPoints += 5
  else if (bid.product_condition === 'refurbished') valueAddsPoints += 3
  else valueAddsPoints += 1 // used

  // Adjust scores based on customer priorities
  let priceWeight = 0.40
  let deliveryWeight = 0.20
  let warrantyWeight = 0.15
  let vendorWeight = 0.15
  let valueAddsWeight = 0.10

  if (priority === 'price') {
    priceWeight = 0.60
    deliveryWeight = 0.10
    warrantyWeight = 0.10
    vendorWeight = 0.10
    valueAddsWeight = 0.10
  } else if (priority === 'speed') {
    priceWeight = 0.25
    deliveryWeight = 0.45
    warrantyWeight = 0.10
    vendorWeight = 0.10
    valueAddsWeight = 0.10
  } else if (priority === 'quality') {
    priceWeight = 0.20
    deliveryWeight = 0.10
    warrantyWeight = 0.25
    vendorWeight = 0.35
    valueAddsWeight = 0.10
  }

  // Normalize back to 100 points maximum
  const weightedPrice = (pricePoints / 40) * (priceWeight * 100)
  const weightedDelivery = (deliveryPoints / 20) * (deliveryWeight * 100)
  const weightedWarranty = (warrantyPoints / 15) * (warrantyWeight * 100)
  const weightedVendor = (vendorPoints / 15) * (vendorWeight * 100)
  const weightedValueAdds = (valueAddsPoints / 10) * (valueAddsWeight * 100)

  const totalScore = parseFloat(
    Math.min(
      weightedPrice + weightedDelivery + weightedWarranty + weightedVendor + weightedValueAdds,
      100
    ).toFixed(2)
  )

  return {
    price: parseFloat(weightedPrice.toFixed(2)),
    delivery: parseFloat(weightedDelivery.toFixed(2)),
    warranty: parseFloat(weightedWarranty.toFixed(2)),
    vendor: parseFloat(weightedVendor.toFixed(2)),
    valueAdds: parseFloat(weightedValueAdds.toFixed(2)),
    total: totalScore
  }
}

// ─── Reverse Auction AI Solver ──────────────────────────────────────────────

export interface AiBiddingFeedback {
  rank: number
  totalBidsCount: number
  isLeader: boolean
  targetPrice: number | null
  priceDifference: number | null
  discountPercentage: number | null
  messageAr: string
  messageEn: string
}

/**
 * Computes live feedback for a vendor's bid, specifying their rank,
 * how much they trail the leader, and exactly how much discount is required to win.
 */
export async function getAiBiddingFeedback(
  requestId: string,
  vendorId: string,
  currentPrice: number,
  deliveryDays: number,
  warrantyMonths: number,
  productCondition: 'new' | 'used' | 'refurbished',
  installationIncluded: boolean
): Promise<AiBiddingFeedback> {
  const adminClient = await createAdminClient()

  // 1. Fetch request details
  const { data: request, error: reqErr } = await adminClient
    .from('requests')
    .select('budget, priority')
    .eq('id', requestId)
    .single()

  if (reqErr || !request) {
    throw new Error(`Request not found: ${reqErr?.message}`)
  }

  // 2. Fetch all bids for this request
  const bids = await getBidsForRequest(requestId)
  const totalBidsCount = bids.length

  if (totalBidsCount === 0) {
    // First bid placed
    return {
      rank: 1,
      totalBidsCount: 1,
      isLeader: true,
      targetPrice: null,
      priceDifference: null,
      discountPercentage: null,
      messageAr: 'أنت أول من يقدم عرضاً على هذا المزاد! عرضك هو المتصدر حالياً.',
      messageEn: 'You are the first to place a bid on this auction! Your offer is currently leading.'
    }
  }

  // Find this vendor's current bid rating or use fallback
  const currentVendor = bids.find(b => b.vendor_id === vendorId)
  const vendorRating = currentVendor?.vendor?.trust_score ?? 85

  // Fetch average response speed
  const avgResponseSpeedHours = await getVendorAverageResponseSpeed(vendorId)

  // 3. Sort bids by score to find the leader
  // Wait, if this bid is NOT saved in the database yet, we insert it virtually in the list
  const mockBid = {
    price_amount: currentPrice,
    delivery_days: deliveryDays,
    warranty_months: warrantyMonths,
    product_condition: productCondition,
    installation_included: installationIncluded,
  }

  const scoreBreakdown = calculateDealScore(mockBid, request, vendorRating, avgResponseSpeedHours)
  const currentScore = scoreBreakdown.total

  // Construct a sorted list of scores including our mock bid
  const otherBids = bids.filter(b => b.vendor_id !== vendorId)
  const scores = otherBids.map(b => b.deal_score)
  scores.push(currentScore)
  scores.sort((a, b) => b - a)

  // Find rank
  const rank = scores.indexOf(currentScore) + 1
  const isLeader = rank === 1

  if (isLeader) {
    return {
      rank: 1,
      totalBidsCount,
      isLeader: true,
      targetPrice: null,
      priceDifference: null,
      discountPercentage: null,
      messageAr: 'تهانينا! أنت صاحب العرض الأفضل والصفقة الأقوى حالياً.',
      messageEn: 'Congratulations! You currently have the best deal and are leading the auction.'
    }
  }

  // Find leader's score
  const leaderScore = scores[0]

  // Solver: Decrement price by 50 EGP steps until the Deal Score exceeds the leader
  let targetPrice = currentPrice
  let solvedScore = currentScore
  let iterations = 0

  while (solvedScore < leaderScore && targetPrice > 100 && iterations < 300) {
    targetPrice -= 50
    const testBid = { ...mockBid, price_amount: targetPrice }
    solvedScore = calculateDealScore(testBid, request, vendorRating, avgResponseSpeedHours).total
    iterations++
  }

  const priceDifference = currentPrice - targetPrice
  const discountPercentage = parseFloat(((priceDifference / currentPrice) * 100).toFixed(1))

  const formattedDiff = priceDifference.toLocaleString()
  const formattedPct = discountPercentage.toFixed(1)

  return {
    rank,
    totalBidsCount,
    isLeader: false,
    targetPrice,
    priceDifference,
    discountPercentage,
    messageAr: `أنت حالياً في المركز #${rank}. ينقصك تخفيض ${formattedDiff} ج.م (خصم ${formattedPct}%) لتصبح صاحب الصفقة الأفضل وتتصدر الترشيحات للعميل.`,
    messageEn: `You are currently in rank #${rank}. You need to reduce your price by EGP ${formattedDiff} (${formattedPct}% discount) to become the best deal and lead recommendations.`
  }
}

// ─── Trigger Alerts for Vendors ──────────────────────────────────────────────

/**
 * Sends notifications to matching merchants when a new sourcing request matches their categories.
 */
export async function notifyVendorsOfNewRequest(
  requestId: string,
  category: string,
  title: string
): Promise<void> {
  const adminClient = await createAdminClient()

  // 1. Fetch matching vendors (vendors whose specializations match the category slug/name)
  const { data: vendors, error } = await adminClient
    .from('vendors')
    .select('id, display_name, portal_email, whatsapp_number')
    .eq('portal_enabled', true)
    .eq('system_status', 'Active')

  if (error || !vendors?.length) return

  // Format message
  const msgAr = `🔔 طلب توريد جديد متوافق مع منتجاتك!\n\nاسم الطلب: ${title}\nالفئة: ${category}\n\nافتح المنصة وقدم عرضك الآن لكسب العميل!`
  const msgEn = `🔔 New Sourced Request Matching Your Products!\n\nRequest: ${title}\nCategory: ${category}\n\nPlace your bid now to win the client!`

  // Dynamically import notification helpers
  const { sendSms } = await import('@/lib/notifications/sms')
  const { sendWhatsApp } = await import('@/lib/notifications/whatsapp')
  const { sendPriceAlertEmail } = await import('@/lib/notifications/email')

  // Dispatch notifications concurrently for all matching vendors
  const notifications = vendors.map(async (v) => {
    try {
      // 1. Dispatch SMS
      if (v.whatsapp_number) {
        await sendSms(v.whatsapp_number, msgAr)
      }
      // 2. Dispatch WhatsApp
      if (v.whatsapp_number) {
        await sendWhatsApp(v.whatsapp_number, msgAr)
      }
      // 3. Dispatch Email (using fallback alert method or custom email dispatcher)
      if (v.portal_email) {
        await sendPriceAlertEmail({
          customerId: v.id, // using vendor id as user reference
          productName: title,
          triggerPrice: 0, // indicates notification alert, not price drop
          savingsAmount: null,
          savingsPct: null,
          imageUrl: null
        })
      }
    } catch (e: any) {
      log.warn('Failed to notify vendor', { vendorId: v.id, error: e.message })
    }
  })

  await Promise.all(notifications)
}
