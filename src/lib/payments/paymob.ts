/**
 * FINDORA — Paymob Egypt Payment Gateway Integration
 * Production-ready. Works without API keys (graceful simulation fallback).
 * 
 * To activate: Set in .env.local:
 *   PAYMOB_API_KEY=your_api_key
 *   PAYMOB_INTEGRATION_ID_CARD=your_card_integration_id
 *   PAYMOB_INTEGRATION_ID_WALLET=your_wallet_integration_id
 *   PAYMOB_IFRAME_ID=your_iframe_id
 *   PAYMOB_HMAC_SECRET=your_hmac_secret
 */

import crypto from 'crypto';
import { createLogger } from '@/lib/utils/logger'
const log = createLogger('payments/paymob')

// ─── Configuration ────────────────────────────────────────────────────────────
const PAYMOB_BASE_URL = 'https://accept.paymob.com/api';

export const PAYMOB_AVAILABLE = Boolean(process.env.PAYMOB_API_KEY);

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PaymobCheckoutParams {
  amountCents: number;         // Amount in EGP cents (10 EGP = 1000 cents)
  orderId: string;             // Internal FINDORA order/request reference
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  items: Array<{
    name: string;
    amount_cents: number;
    description: string;
    quantity: number;
  }>;
  paymentMethod?: 'card' | 'wallet'; // default: 'card'
}

export interface PaymobCheckoutResult {
  success: boolean;
  paymentUrl?: string;
  paymobOrderId?: number;
  paymentKey?: string;
  isSimulated?: boolean;
  error?: string;
}

export interface PaymobWebhookPayload {
  id: number;
  pending: boolean;
  amount_cents: number;
  success: boolean;
  is_refund: boolean;
  is_3d_secure: boolean;
  error_occured: boolean;
  has_parent_transaction: boolean;
  order: {
    id: number;
    created_at: string;
    delivery_needed: boolean;
    merchant: { id: number };
    collector: null;
    amount_cents: number;
    shipping_data: Record<string, any>;
    currency: string;
    merchant_order_id: string; // Our internal orderId
  };
  source_data: {
    pan?: string;
    type: string;     // 'card', 'wallet', etc.
    tenure: null;
  };
  data: {
    gateway_integration_pk: number;
    klass: string;
    created_at: string;
    transaction_processed_callback_responses: string[];
    uid: string;
    message: string;
    [key: string]: any;
  };
  hmac?: string;
}

// ─── Step 1: Authenticate ─────────────────────────────────────────────────────
async function getAuthToken(): Promise<string> {
  const response = await fetch(`${PAYMOB_BASE_URL}/auth/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY }),
  });

  if (!response.ok) {
    throw new Error(`Paymob auth failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.token) throw new Error('Paymob auth: no token in response');
  return data.token;
}

// ─── Step 2: Register Order ───────────────────────────────────────────────────
async function registerOrder(
  authToken: string,
  params: PaymobCheckoutParams
): Promise<number> {
  const response = await fetch(`${PAYMOB_BASE_URL}/ecommerce/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: authToken,
      delivery_needed: false,
      amount_cents: params.amountCents,
      currency: 'EGP',
      merchant_order_id: params.orderId,
      items: params.items,
    }),
  });

  if (!response.ok) {
    throw new Error(`Paymob order registration failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data.id) throw new Error('Paymob: no order ID in response');
  return data.id;
}

// ─── Step 3: Get Payment Key ──────────────────────────────────────────────────
async function getPaymentKey(
  authToken: string,
  paymobOrderId: number,
  params: PaymobCheckoutParams
): Promise<string> {
  const integrationId = params.paymentMethod === 'wallet'
    ? process.env.PAYMOB_INTEGRATION_ID_WALLET
    : process.env.PAYMOB_INTEGRATION_ID_CARD;

  const response = await fetch(`${PAYMOB_BASE_URL}/acceptance/payment_keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: authToken,
      amount_cents: params.amountCents,
      expiration: 3600,           // 1 hour payment window
      order_id: paymobOrderId,
      currency: 'EGP',
      integration_id: Number(integrationId),
      billing_data: {
        first_name: params.customerFirstName,
        last_name: params.customerLastName,
        email: params.customerEmail,
        phone_number: params.customerPhone,
        apartment: 'NA',
        floor: 'NA',
        street: 'NA',
        building: 'NA',
        shipping_method: 'NA',
        postal_code: 'NA',
        city: 'Cairo',
        country: 'EG',
        state: 'Cairo',
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Paymob payment key failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data.token) throw new Error('Paymob: no payment token in response');
  return data.token;
}

// ─── Main: Create Checkout Session ───────────────────────────────────────────
export async function createPaymobCheckout(
  params: PaymobCheckoutParams
): Promise<PaymobCheckoutResult> {
  // SIMULATION MODE: If no API key configured
  if (!PAYMOB_AVAILABLE) {
    const simulatedUrl = `/en/customer/checkout/simulate?orderId=${params.orderId}&amount=${params.amountCents / 100}&simulated=true`;
    return {
      success: true,
      paymentUrl: simulatedUrl,
      isSimulated: true,
    };
  }

  try {
    // 3-step Paymob flow
    const authToken = await getAuthToken();
    const paymobOrderId = await registerOrder(authToken, params);
    const paymentKey = await getPaymentKey(authToken, paymobOrderId, params);

    const iframeId = process.env.PAYMOB_IFRAME_ID;
    const paymentUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`;

    return {
      success: true,
      paymentUrl,
      paymobOrderId,
      paymentKey,
      isSimulated: false,
    };
  } catch (err: any) {
    log.error('[PAYMOB] Checkout error:', err.message);
    return {
      success: false,
      error: err.message || 'Payment gateway error',
    };
  }
}

// ─── Webhook HMAC Verification ────────────────────────────────────────────────
/**
 * Verifies Paymob's webhook signature using HMAC-SHA512.
 * Paymob concatenates specific fields in a specific order before hashing.
 */
export function verifyPaymobWebhookHmac(
  payload: Record<string, any>,
  receivedHmac: string
): boolean {
  const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
  if (!hmacSecret) {
    log.warn('[PAYMOB] HMAC_SECRET not configured — skipping webhook verification');
    return true; // Allow in dev/unconfigured mode
  }

  // Paymob's HMAC fields (must be in this exact order)
  const fields = [
    'amount_cents', 'created_at', 'currency', 'error_occured',
    'has_parent_transaction', 'id', 'integration_id', 'is_3d_secure',
    'is_auth', 'is_capture', 'is_refund', 'is_standalone_payment',
    'is_voided', 'order', 'owner', 'pending', 'source_data.pan',
    'source_data.sub_type', 'source_data.type', 'success',
  ];

  const concatenated = fields
    .map(field => {
      const parts = field.split('.');
      let value = payload;
      for (const part of parts) {
        value = value?.[part];
      }
      return String(value ?? '');
    })
    .join('');

  const expectedHmac = crypto
    .createHmac('sha512', hmacSecret)
    .update(concatenated)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedHmac, 'hex'),
    Buffer.from(receivedHmac.toLowerCase(), 'hex')
  );
}

// ─── Refund (Future use) ──────────────────────────────────────────────────────
export async function refundPaymobTransaction(
  transactionId: number,
  amountCents: number
): Promise<{ success: boolean; error?: string }> {
  if (!PAYMOB_AVAILABLE) {
    return { success: true }; // Simulated refund
  }

  try {
    const authToken = await getAuthToken();
    const response = await fetch(`${PAYMOB_BASE_URL}/acceptance/void_refund/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        transaction_id: transactionId,
        amount_cents: amountCents,
      }),
    });
    const data = await response.json();
    return { success: data.success === true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
