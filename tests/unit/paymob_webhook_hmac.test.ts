import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { verifyPaymobWebhookHmac, PaymobWebhookPayload } from '@/lib/payments/paymob';
import { POST } from '@/app/api/webhooks/paymob/route';
import * as paymentsDal from '@/lib/dal/payments';
import * as customersDal from '@/lib/dal/customers';

// Mock dependencies of the route
jest.mock('@/lib/dal/payments', () => ({
  confirmPaymentIntentSystem: jest.fn(),
  getPaymentIntentByRequestId: jest.fn(),
}));

jest.mock('@/lib/dal/customers', () => ({
  createAdminClient: jest.fn(),
}));

describe('P1-08 — Paymob Webhook HMAC Security Boundary', () => {
  const TEST_SECRET = 'test_paymob_hmac_secret_key_abcdef123456';
  const originalEnv = process.env;

  const samplePayload: PaymobWebhookPayload = {
    id: 1234567,
    pending: false,
    amount_cents: 50000,
    success: true,
    is_refund: false,
    is_3d_secure: true,
    error_occured: false,
    has_parent_transaction: false,
    order: {
      id: 98765,
      created_at: '2026-09-20T10:00:00.000Z',
      delivery_needed: false,
      merchant: { id: 111 },
      collector: null,
      amount_cents: 50000,
      shipping_data: {},
      currency: 'EGP',
      merchant_order_id: 'REQ-2026-001',
    },
    source_data: {
      pan: '2345',
      type: 'card',
      tenure: null,
    },
    data: {
      gateway_integration_pk: 1234,
      klass: 'Transaction',
      created_at: '2026-09-20T10:00:00.000Z',
      transaction_processed_callback_responses: [],
      uid: 'uid-1234',
      message: 'Approved',
    },
  };

  function computeValidHmac(payload: Record<string, any>, secret: string): string {
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
        let value: any = payload;
        for (const part of parts) {
          value = value?.[part];
        }
        return String(value ?? '');
      })
      .join('');

    return crypto
      .createHmac('sha512', secret)
      .update(concatenated)
      .digest('hex');
  }

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, PAYMOB_HMAC_SECRET: TEST_SECRET };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // =========================================================================
  // Unit Tests: verifyPaymobWebhookHmac
  // =========================================================================

  test('TEST 1 — Valid signature returns true', () => {
    const validHmac = computeValidHmac(samplePayload as any, TEST_SECRET);
    const result = verifyPaymobWebhookHmac(samplePayload as any, validHmac);
    expect(result).toBe(true);
  });

  test('TEST 2 — Wrong signature returns false', () => {
    // 128 hex chars, but incorrect digest
    const wrongHmac = 'a'.repeat(128);
    const result = verifyPaymobWebhookHmac(samplePayload as any, wrongHmac);
    expect(result).toBe(false);
  });

  test('TEST 3 — Missing signature returns false', () => {
    expect(verifyPaymobWebhookHmac(samplePayload as any, '')).toBe(false);
    expect(verifyPaymobWebhookHmac(samplePayload as any, undefined as any)).toBe(false);
    expect(verifyPaymobWebhookHmac(samplePayload as any, null as any)).toBe(false);
  });

  test('TEST 4 — Wrong-length signature returns false without throwing exception', () => {
    // Too short
    expect(() => verifyPaymobWebhookHmac(samplePayload as any, 'abc')).not.toThrow();
    expect(verifyPaymobWebhookHmac(samplePayload as any, 'abc')).toBe(false);

    // Truncated (e.g. 64 hex characters instead of 128)
    const truncatedHmac = 'f'.repeat(64);
    expect(() => verifyPaymobWebhookHmac(samplePayload as any, truncatedHmac)).not.toThrow();
    expect(verifyPaymobWebhookHmac(samplePayload as any, truncatedHmac)).toBe(false);

    // Too long (e.g. 130 hex characters)
    const longHmac = 'f'.repeat(130);
    expect(() => verifyPaymobWebhookHmac(samplePayload as any, longHmac)).not.toThrow();
    expect(verifyPaymobWebhookHmac(samplePayload as any, longHmac)).toBe(false);
  });

  test('TEST 5 — Missing PAYMOB_HMAC_SECRET fails closed', () => {
    delete process.env.PAYMOB_HMAC_SECRET;
    const validHmac = computeValidHmac(samplePayload as any, TEST_SECRET);
    const result = verifyPaymobWebhookHmac(samplePayload as any, validHmac);
    expect(result).toBe(false);
  });

  test('TEST 6 — Fail-open regression guard: missing secret never returns true', () => {
    delete process.env.PAYMOB_HMAC_SECRET;

    // Test with various payloads and arbitrary strings
    expect(verifyPaymobWebhookHmac(samplePayload as any, 'arbitrary_signature')).toBe(false);
    expect(verifyPaymobWebhookHmac({}, 'arbitrary_signature')).toBe(false);
    expect(verifyPaymobWebhookHmac(samplePayload as any, '')).toBe(false);
    expect(verifyPaymobWebhookHmac({ success: true }, 'a'.repeat(128))).toBe(false);
  });

  // =========================================================================
  // Integration Tests: POST /api/webhooks/paymob Route Handler
  // =========================================================================

  test('TEST 7 — Route with invalid HMAC returns 200 { received: true, note: "hmac_invalid" } and halts before DB calls', async () => {
    const invalidHmac = '0'.repeat(128);
    const req = new NextRequest(`http://localhost/api/webhooks/paymob?hmac=${invalidHmac}`, {
      method: 'POST',
      body: JSON.stringify(samplePayload),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ received: true, note: 'hmac_invalid' });

    // Privileged DB functions MUST NOT be reached
    expect(customersDal.createAdminClient).not.toHaveBeenCalled();
    expect(paymentsDal.confirmPaymentIntentSystem).not.toHaveBeenCalled();
    expect(paymentsDal.getPaymentIntentByRequestId).not.toHaveBeenCalled();
  });

  test('TEST 8 — Route with valid HMAC proceeds to process matching payment intent', async () => {
    const validHmac = computeValidHmac(samplePayload as any, TEST_SECRET);
    const req = new NextRequest(`http://localhost/api/webhooks/paymob?hmac=${validHmac}`, {
      method: 'POST',
      body: JSON.stringify(samplePayload),
      headers: { 'Content-Type': 'application/json' },
    });

    const mockDb = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }),
    };

    (customersDal.createAdminClient as jest.Mock).mockResolvedValue(mockDb);
    (paymentsDal.getPaymentIntentByRequestId as jest.Mock).mockResolvedValue({
      id: 'pi-12345',
      request_id: 'REQ-2026-001',
      status: 'pending',
    });
    (paymentsDal.confirmPaymentIntentSystem as jest.Mock).mockResolvedValue({
      id: 'pi-12345',
      status: 'confirmed',
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ received: true });

    expect(customersDal.createAdminClient).toHaveBeenCalled();
    expect(paymentsDal.getPaymentIntentByRequestId).toHaveBeenCalledWith('REQ-2026-001');
    expect(paymentsDal.confirmPaymentIntentSystem).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'pi-12345',
        externalReference: '1234567',
      })
    );
  });

  test('TEST 9 — Privileged side-effect boundary: unauthenticated webhook cannot trigger payment confirmation', async () => {
    // Missing HMAC query and missing payload.hmac
    const req = new NextRequest('http://localhost/api/webhooks/paymob', {
      method: 'POST',
      body: JSON.stringify({
        ...samplePayload,
        order: { ...samplePayload.order, merchant_order_id: 'CRITICAL-TARGET-ORDER' },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ received: true, note: 'hmac_invalid' });

    // Assert absolute zero privilege escalation
    expect(paymentsDal.confirmPaymentIntentSystem).not.toHaveBeenCalled();
    expect(customersDal.createAdminClient).not.toHaveBeenCalled();
  });
});
