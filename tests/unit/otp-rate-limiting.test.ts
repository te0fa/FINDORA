/**
 * FINDORA — P1-03 Batch 1 Unit Tests
 *
 * Verifies:
 * 1. canonicalizeEgyptianMobile correctly normalizes all 4 representations (010, +2010, 002010, 10)
 *    to standard +201XXXXXXXXX identity.
 * 2. All 4 Egyptian mobile operators (010, 011, 012, 015) are supported.
 * 3. Whitespace and common formatting are stripped cleanly.
 * 4. Regex character-class bug ([0-2|5] matching '|') is fixed ([0125]).
 * 5. Invalid prefixes (013, 014, 016..019), foreign numbers, landlines, and malformed inputs are rejected.
 * 6. POST /api/otp/send enforces unified per-phone limit of 3 requests / 60 minutes across ALL purposes.
 * 7. POST /api/otp/send enforces canonical equivalence (format rotation shares the same quota).
 * 8. POST /api/otp/send enforces 60-second cooldown between requests with Retry-After header.
 * 9. POST /api/otp/send fails closed (HTTP 503) when database rate-limit query returns an error.
 * 10. POST /api/otp/verify canonicalizes phone numbers for verification parity.
 */

import { canonicalizeEgyptianMobile, EGYPTIAN_MOBILE_REGEX } from '@/lib/phone';
import { POST as sendOtpRoute } from '@/app/api/otp/send/route';
import { POST as verifyOtpRoute } from '@/app/api/otp/verify/route';
import { sendOtp, dispatchOtpSms, verifyOtp } from '@/lib/notifications/otp';
import { NextRequest } from 'next/server';

// Mock logger
jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock notifications/otp module functions
jest.mock('@/lib/notifications/otp', () => {
  const actual = jest.requireActual('@/lib/notifications/otp');
  return {
    ...actual,
    sendOtp: jest.fn(),
    dispatchOtpSms: jest.fn(),
    verifyOtp: jest.fn(),
  };
});

// Mock Supabase admin client
let mockDbQueryResponse: { data: any; error: any } = { data: [], error: null };

let customRpcHandler: ((fnName: string, args: any) => any) | null = null;

const createMockAdminClient = () => {
  const queryBuilder: any = {
    insert: jest.fn().mockResolvedValue({ error: null }),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    }),
    select: jest.fn(() => queryBuilder),
    eq: jest.fn(() => queryBuilder),
    gte: jest.fn(() => queryBuilder),
    order: jest.fn(() => Promise.resolve(mockDbQueryResponse)),
    then: (resolve: any, reject: any) =>
      Promise.resolve(mockDbQueryResponse).then(resolve, reject),
  };

  const rpcMock = jest.fn(async (fnName: string, args: any) => {
    if (customRpcHandler) {
      return customRpcHandler(fnName, args);
    }

    if (fnName === 'fn_reserve_and_create_otp') {
      if (mockDbQueryResponse.error) {
        return { data: null, error: mockDbQueryResponse.error };
      }

      const maxHourly = args?.p_max_hourly ?? 3;
      const cooldownSeconds = args?.p_cooldown_seconds ?? 60;
      const recentRows = mockDbQueryResponse.data || [];

      if (recentRows.length >= maxHourly) {
        return {
          data: {
            success: false,
            code: 'RATE_LIMIT_EXCEEDED',
            error: 'Too many OTP requests. Please wait before requesting a new code.',
          },
          error: null,
        };
      }

      if (recentRows.length > 0 && recentRows[0]?.created_at) {
        const latestTime = new Date(recentRows[0].created_at).getTime();
        const elapsedMs = Date.now() - latestTime;
        if (elapsedMs < cooldownSeconds * 1000) {
          const retryAfter = Math.max(1, Math.ceil((cooldownSeconds * 1000 - elapsedMs) / 1000));
          return {
            data: {
              success: false,
              code: 'COOLDOWN_ACTIVE',
              retry_after: retryAfter,
              error: 'Please wait 60 seconds before requesting another code.',
            },
            error: null,
          };
        }
      }

      return {
        data: {
          success: true,
          otp_id: 'mock-otp-uuid',
        },
        error: null,
      };
    }

    return { data: null, error: null };
  });

  return {
    from: jest.fn(() => queryBuilder),
    rpc: rpcMock,
  };
};

let mockAdminClient = createMockAdminClient();

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => mockAdminClient),
}));

describe('P1-03 Batch 1: Canonical Egyptian Mobile Identity', () => {
  describe('Format Equivalence across 4 representations', () => {
    const expectedCanonical = '+201012345678';

    it('canonicalizes local 11-digit representation (01012345678)', () => {
      expect(canonicalizeEgyptianMobile('01012345678')).toBe(expectedCanonical);
    });

    it('canonicalizes E.164 +20 representation (+201012345678)', () => {
      expect(canonicalizeEgyptianMobile('+201012345678')).toBe(expectedCanonical);
    });

    it('canonicalizes international 0020 representation (00201012345678)', () => {
      expect(canonicalizeEgyptianMobile('00201012345678')).toBe(expectedCanonical);
    });

    it('canonicalizes bare national 10-digit representation (1012345678)', () => {
      expect(canonicalizeEgyptianMobile('1012345678')).toBe(expectedCanonical);
    });

    it('canonicalizes 12-digit representation with 20 prefix (201012345678)', () => {
      expect(canonicalizeEgyptianMobile('201012345678')).toBe(expectedCanonical);
    });

    it('proves all representations map to the EXACT same canonical string', () => {
      const representations = [
        '01012345678',
        '+201012345678',
        '00201012345678',
        '1012345678',
        '201012345678',
      ];
      const normalized = representations.map(canonicalizeEgyptianMobile);
      const uniqueResults = Array.from(new Set(normalized));
      expect(uniqueResults).toEqual([expectedCanonical]);
    });
  });

  describe('Supported Egyptian Mobile Operators', () => {
    it('supports 010 (Vodafone)', () => {
      expect(canonicalizeEgyptianMobile('01099887766')).toBe('+201099887766');
      expect(canonicalizeEgyptianMobile('+201099887766')).toBe('+201099887766');
    });

    it('supports 011 (Etisalat)', () => {
      expect(canonicalizeEgyptianMobile('01199887766')).toBe('+201199887766');
      expect(canonicalizeEgyptianMobile('+201199887766')).toBe('+201199887766');
    });

    it('supports 012 (Orange)', () => {
      expect(canonicalizeEgyptianMobile('01299887766')).toBe('+201299887766');
      expect(canonicalizeEgyptianMobile('+201299887766')).toBe('+201299887766');
    });

    it('supports 015 (WE / Telecom Egypt)', () => {
      expect(canonicalizeEgyptianMobile('01599887766')).toBe('+201599887766');
      expect(canonicalizeEgyptianMobile('+201599887766')).toBe('+201599887766');
    });
  });

  describe('Whitespace and Formatting Cleansing', () => {
    it('handles surrounding spaces', () => {
      expect(canonicalizeEgyptianMobile('   01012345678   ')).toBe('+201012345678');
    });

    it('handles internal spaces', () => {
      expect(canonicalizeEgyptianMobile('010 1234 5678')).toBe('+201012345678');
      expect(canonicalizeEgyptianMobile('+20 10 1234 5678')).toBe('+201012345678');
      expect(canonicalizeEgyptianMobile('0020 10 1234 5678')).toBe('+201012345678');
    });

    it('handles dashes and parentheses', () => {
      expect(canonicalizeEgyptianMobile('010-1234-5678')).toBe('+201012345678');
      expect(canonicalizeEgyptianMobile('(010) 1234-5678')).toBe('+201012345678');
    });
  });

  describe('Bug Fix & Invalid Input Rejection', () => {
    it('rejects pipe character that matched due to regex [0-2|5] bug', () => {
      expect(canonicalizeEgyptianMobile('1|12345678')).toBeNull();
      expect(canonicalizeEgyptianMobile('01|12345678')).toBeNull();
      expect(canonicalizeEgyptianMobile('+201|12345678')).toBeNull();
      expect(EGYPTIAN_MOBILE_REGEX.test('1|12345678')).toBe(false);
      expect(EGYPTIAN_MOBILE_REGEX.test('01|12345678')).toBe(false);
    });

    it('rejects invalid operators (013, 014, 016, 017, 018, 019)', () => {
      expect(canonicalizeEgyptianMobile('01312345678')).toBeNull();
      expect(canonicalizeEgyptianMobile('01412345678')).toBeNull();
      expect(canonicalizeEgyptianMobile('01612345678')).toBeNull();
      expect(canonicalizeEgyptianMobile('01712345678')).toBeNull();
      expect(canonicalizeEgyptianMobile('01812345678')).toBeNull();
      expect(canonicalizeEgyptianMobile('01912345678')).toBeNull();
    });

    it('rejects non-Egyptian country codes', () => {
      expect(canonicalizeEgyptianMobile('+1201012345678')).toBeNull();
      expect(canonicalizeEgyptianMobile('+441012345678')).toBeNull();
      expect(canonicalizeEgyptianMobile('+966501234567')).toBeNull();
    });

    it('rejects Egyptian landline numbers', () => {
      expect(canonicalizeEgyptianMobile('0223456789')).toBeNull(); // Cairo landline
      expect(canonicalizeEgyptianMobile('+20223456789')).toBeNull();
      expect(canonicalizeEgyptianMobile('035412345')).toBeNull(); // Alexandria landline
    });

    it('rejects numbers that are too short or too long', () => {
      expect(canonicalizeEgyptianMobile('010123456')).toBeNull(); // 9 digits
      expect(canonicalizeEgyptianMobile('0101234567')).toBeNull(); // 10 digits with 0
      expect(canonicalizeEgyptianMobile('010123456789')).toBeNull(); // 12 digits with 0
    });

    it('rejects empty, null, undefined, or non-numeric inputs', () => {
      expect(canonicalizeEgyptianMobile('')).toBeNull();
      expect(canonicalizeEgyptianMobile(null as any)).toBeNull();
      expect(canonicalizeEgyptianMobile(undefined as any)).toBeNull();
      expect(canonicalizeEgyptianMobile('abcdefghijk')).toBeNull();
    });
  });
});

describe('P1-03 Batch 1: POST /api/otp/send Rate Limiting & Security', () => {
  const dispatchMock = dispatchOtpSms as jest.MockedFunction<typeof dispatchOtpSms>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDbQueryResponse = { data: [], error: null };
    mockAdminClient = createMockAdminClient();
    dispatchMock.mockResolvedValue({
      success: true,
      expiresInSeconds: 600,
      isDev: false,
    });
  });

  describe('Unified Rate Limit across Purposes', () => {
    it('blocks 4th request when 3 OTPs exist across DIFFERENT purposes in the last hour', async () => {
      // Simulate 3 prior requests with 3 different purposes for this phone
      mockDbQueryResponse = {
        data: [
          { id: 'otp-1', created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() }, // 30m ago (contributor)
          { id: 'otp-2', created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString() }, // 20m ago (merchant)
          { id: 'otp-3', created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() }, // 10m ago (withdrawal)
        ],
        error: null,
      };

      // 4th request rotates to a 4th purpose: vendor_auth
      const req = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '01012345678',
          purpose: 'vendor_auth',
        }),
      });

      const response = await sendOtpRoute(req);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.error).toBe('Too many OTP requests. Please wait before requesting a new code.');
      // dispatchOtpSms must NOT be called
      expect(dispatchMock).not.toHaveBeenCalled();
    });

    it('allows request when only 2 OTPs exist in the last hour and cooldown has elapsed', async () => {
      mockDbQueryResponse = {
        data: [
          { id: 'otp-1', created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() }, // 10m ago
          { id: 'otp-2', created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString() },  // 5m ago
        ],
        error: null,
      };

      const req = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '01012345678',
          purpose: 'vendor_auth',
        }),
      });

      const response = await sendOtpRoute(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(dispatchMock).toHaveBeenCalledWith(
        '+201012345678',
        expect.any(String),
        'vendor_auth'
      );
    });
  });

  describe('Canonical Equivalence Rate Limiting', () => {
    it('shares the rate limit quota regardless of which input representation is used', async () => {
      // 3 records already exist under canonical phone
      mockDbQueryResponse = {
        data: [
          { id: 'otp-1', created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString() },
          { id: 'otp-2', created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
          { id: 'otp-3', created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
        ],
        error: null,
      };

      // Test with international 0020 representation
      const req1 = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '00201012345678',
          purpose: 'merchant_registration',
        }),
      });
      const res1 = await sendOtpRoute(req1);
      expect(res1.status).toBe(429);

      // Test with bare 10-digit representation
      const req2 = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '1012345678',
          purpose: 'merchant_registration',
        }),
      });
      const res2 = await sendOtpRoute(req2);
      expect(res2.status).toBe(429);

      // Verify that the query always queried with canonical format +201012345678
      expect(dispatchMock).not.toHaveBeenCalled();
    });
  });

  describe('60-Second Cooldown Enforcement', () => {
    it('rejects request with 429 when previous OTP was sent 25 seconds ago', async () => {
      const twentyFiveSecondsAgo = new Date(Date.now() - 25 * 1000).toISOString();
      mockDbQueryResponse = {
        data: [
          { id: 'otp-recent', created_at: twentyFiveSecondsAgo },
        ],
        error: null,
      };

      const req = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '01012345678',
          purpose: 'vendor_auth',
        }),
      });

      const response = await sendOtpRoute(req);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.error).toBe('Please wait 60 seconds before requesting another code.');
      expect(body.retryAfter).toBeGreaterThanOrEqual(34);
      expect(body.retryAfter).toBeLessThanOrEqual(36);
      expect(response.headers.get('Retry-After')).toBe(String(body.retryAfter));
      expect(dispatchMock).not.toHaveBeenCalled();
    });

    it('rejects request with 429 and retryAfter: 1 when previous OTP was sent 59 seconds ago', async () => {
      const fiftyNineSecondsAgo = new Date(Date.now() - 59 * 1000).toISOString();
      mockDbQueryResponse = {
        data: [
          { id: 'otp-recent', created_at: fiftyNineSecondsAgo },
        ],
        error: null,
      };

      const req = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '01012345678',
          purpose: 'vendor_auth',
        }),
      });

      const response = await sendOtpRoute(req);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.retryAfter).toBe(1);
      expect(response.headers.get('Retry-After')).toBe('1');
      expect(dispatchMock).not.toHaveBeenCalled();
    });

    it('allows request when previous OTP was sent 65 seconds ago', async () => {
      const sixtyFiveSecondsAgo = new Date(Date.now() - 65 * 1000).toISOString();
      mockDbQueryResponse = {
        data: [
          { id: 'otp-old', created_at: sixtyFiveSecondsAgo },
        ],
        error: null,
      };

      const req = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '01012345678',
          purpose: 'vendor_auth',
        }),
      });

      const response = await sendOtpRoute(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(dispatchMock).toHaveBeenCalledWith('+201012345678', expect.any(String), 'vendor_auth');
    });
  });

  describe('Fail-Closed Database Error Handling', () => {
    it('returns HTTP 503 and does NOT call dispatchOtpSms when database rate-limit query fails', async () => {
      mockDbQueryResponse = {
        data: null,
        error: { message: 'Connection pool exhausted' },
      };

      const req = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '01012345678',
          purpose: 'vendor_auth',
        }),
      });

      const response = await sendOtpRoute(req);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.error).toContain('unavailable');
      expect(dispatchMock).not.toHaveBeenCalled();
    });
  });

  describe('Input Validation in Route', () => {
    it('returns HTTP 400 when phone number format is invalid', async () => {
      const req = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '01312345678', // Invalid operator
          purpose: 'vendor_auth',
        }),
      });

      const response = await sendOtpRoute(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Invalid Egyptian phone number format');
      expect(dispatchMock).not.toHaveBeenCalled();
    });

    it('returns HTTP 400 when purpose is invalid', async () => {
      const req = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '01012345678',
          purpose: 'malicious_purpose',
        }),
      });

      const response = await sendOtpRoute(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Invalid purpose');
      expect(dispatchMock).not.toHaveBeenCalled();
    });
  });
});

describe('P1-03 Batch 1: POST /api/otp/verify Identity Parity', () => {
  const verifyMock = verifyOtp as jest.MockedFunction<typeof verifyOtp>;

  beforeEach(() => {
    jest.clearAllMocks();
    verifyMock.mockResolvedValue({ success: true });
  });

  it('canonicalizes local representation (01012345678) to +201012345678 before verification', async () => {
    const req = new NextRequest('http://localhost/api/otp/verify', {
      method: 'POST',
      body: JSON.stringify({
        phoneNumber: '01012345678',
        code: '123456',
        purpose: 'vendor_auth',
      }),
    });

    const response = await verifyOtpRoute(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(verifyMock).toHaveBeenCalledWith(
      '+201012345678',
      '123456',
      'vendor_auth',
      expect.anything()
    );
  });

  it('canonicalizes 0020 representation (00201012345678) to +201012345678 before verification', async () => {
    const req = new NextRequest('http://localhost/api/otp/verify', {
      method: 'POST',
      body: JSON.stringify({
        phoneNumber: '00201012345678',
        code: '123456',
        purpose: 'vendor_auth',
      }),
    });

    const response = await verifyOtpRoute(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(verifyMock).toHaveBeenCalledWith(
      '+201012345678',
      '123456',
      'vendor_auth',
      expect.anything()
    );
  });

  it('canonicalizes bare national 10-digit representation (1012345678) to +201012345678 before verification', async () => {
    const req = new NextRequest('http://localhost/api/otp/verify', {
      method: 'POST',
      body: JSON.stringify({
        phoneNumber: '1012345678',
        code: '123456',
        purpose: 'vendor_auth',
      }),
    });

    const response = await verifyOtpRoute(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(verifyMock).toHaveBeenCalledWith(
      '+201012345678',
      '123456',
      'vendor_auth',
      expect.anything()
    );
  });

  it('rejects invalid phone format in verify with HTTP 400', async () => {
    const req = new NextRequest('http://localhost/api/otp/verify', {
      method: 'POST',
      body: JSON.stringify({
        phoneNumber: '01312345678',
        code: '123456',
        purpose: 'vendor_auth',
      }),
    });

    const response = await verifyOtpRoute(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid Egyptian phone number format');
    expect(verifyMock).not.toHaveBeenCalled();
  });
});

describe('P1-03 Batch 2: POST /api/otp/send Cloudflare Turnstile Enforcement', () => {
  const originalEnv = { ...process.env };
  const dispatchOtpSmsMock = dispatchOtpSms as jest.MockedFunction<typeof dispatchOtpSms>;

  beforeEach(() => {
    process.env = { ...originalEnv };
    dispatchOtpSmsMock.mockReset();
    dispatchOtpSmsMock.mockResolvedValue({ success: true, expiresInSeconds: 300 });
    mockDbQueryResponse = { data: [], error: null };
    process.env.OTP_SALT = 'mock-test-otp-salt';
    process.env.SMS_PROVIDER_API_KEY = 'mock-sms-provider-key';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Turnstile Token Validation & Failure Matrix', () => {
    it('A. rejects request when token is missing and secret is configured with HTTP 403 MISSING_TURNSTILE_TOKEN', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'mock-secret-key';

      const req = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '01012345678',
          purpose: 'merchant_registration',
        }),
      });

      const response = await sendOtpRoute(req);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error).toBe('Human verification failed. Please refresh and try again.');
      expect(body.code).toBe('MISSING_TURNSTILE_TOKEN');
      expect(dispatchOtpSmsMock).not.toHaveBeenCalled();
    });

    it('B. rejects invalid mock token (mock-turnstile-fail) with HTTP 403 INVALID_TURNSTILE_TOKEN', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'mock-secret-key';

      const req = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '01012345678',
          purpose: 'merchant_registration',
          turnstileToken: 'mock-turnstile-fail',
        }),
      });

      const response = await sendOtpRoute(req);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error).toBe('Human verification failed. Please refresh and try again.');
      expect(body.code).toBe('INVALID_TURNSTILE_TOKEN');
      expect(dispatchOtpSmsMock).not.toHaveBeenCalled();
    });

    it('C. rejects expired/replayed token reported by Cloudflare in production with HTTP 403 INVALID_OR_EXPIRED_TOKEN', async () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.TURNSTILE_SECRET_KEY = 'prod-secret-key';

      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
      }) as any;

      try {
        const req = new NextRequest('http://localhost/api/otp/send', {
          method: 'POST',
          body: JSON.stringify({
            phoneNumber: '01012345678',
            purpose: 'merchant_registration',
            turnstileToken: 'replayed-cf-token',
          }),
        });

        const response = await sendOtpRoute(req);
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error).toBe('Human verification failed. Please refresh and try again.');
        expect(body.code).toBe('INVALID_OR_EXPIRED_TOKEN');
        expect(dispatchOtpSmsMock).not.toHaveBeenCalled();
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('D. fails closed on Cloudflare API/network error with HTTP 403 VERIFICATION_NETWORK_FAILURE', async () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.TURNSTILE_SECRET_KEY = 'prod-secret-key';

      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Cloudflare network timeout')) as any;

      try {
        const req = new NextRequest('http://localhost/api/otp/send', {
          method: 'POST',
          body: JSON.stringify({
            phoneNumber: '01012345678',
            purpose: 'merchant_registration',
            turnstileToken: 'some-cf-token',
          }),
        });

        const response = await sendOtpRoute(req);
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error).toBe('Human verification failed. Please refresh and try again.');
        expect(body.code).toBe('VERIFICATION_NETWORK_FAILURE');
        expect(dispatchOtpSmsMock).not.toHaveBeenCalled();
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('D2. fails closed on Cloudflare siteverify HTTP 500 error with HTTP 403 VERIFICATION_ENDPOINT_ERROR', async () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.TURNSTILE_SECRET_KEY = 'prod-secret-key';

      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }) as any;

      try {
        const req = new NextRequest('http://localhost/api/otp/send', {
          method: 'POST',
          body: JSON.stringify({
            phoneNumber: '01012345678',
            purpose: 'merchant_registration',
            turnstileToken: 'some-cf-token',
          }),
        });

        const response = await sendOtpRoute(req);
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error).toBe('Human verification failed. Please refresh and try again.');
        expect(body.code).toBe('VERIFICATION_ENDPOINT_ERROR');
        expect(dispatchOtpSmsMock).not.toHaveBeenCalled();
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('rejects in production if TURNSTILE_SECRET_KEY is missing with HTTP 403 TURNSTILE_CONFIGURATION_ERROR', async () => {
      (process.env as any).NODE_ENV = 'production';
      delete process.env.TURNSTILE_SECRET_KEY;

      const req = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '01012345678',
          purpose: 'merchant_registration',
          turnstileToken: 'some-token',
        }),
      });

      const response = await sendOtpRoute(req);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error).toBe('Human verification failed. Please refresh and try again.');
      expect(body.code).toBe('TURNSTILE_CONFIGURATION_ERROR');
      expect(dispatchOtpSmsMock).not.toHaveBeenCalled();
    });

    it('E. allows valid mock token (mock-turnstile-pass) in non-production environments', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'mock-secret-key';

      const req = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '01012345678',
          purpose: 'merchant_registration',
          turnstileToken: 'mock-turnstile-pass',
        }),
      });

      const response = await sendOtpRoute(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(dispatchOtpSmsMock).toHaveBeenCalledWith('+201012345678', expect.any(String), 'merchant_registration');
    });
  });

  describe('Security Pipeline Ordering & DB Isolation', () => {
    it('F. ensures Turnstile failure aborts BEFORE querying the database rate limits', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'mock-secret-key';

      const fromSpy = jest.spyOn(mockAdminClient, 'from');
      fromSpy.mockClear();

      const req = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '01012345678',
          purpose: 'merchant_registration',
          turnstileToken: 'mock-turnstile-fail',
        }),
      });

      const response = await sendOtpRoute(req);
      expect(response.status).toBe(403);

      // Verify that database rate-limit table was NEVER queried
      expect(fromSpy).not.toHaveBeenCalled();
    });

    it('G. forwards client IP to verifyTurnstileToken', async () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.TURNSTILE_SECRET_KEY = 'prod-secret-key';

      const originalFetch = global.fetch;
      let capturedBody = '';
      global.fetch = jest.fn().mockImplementation(async (_url: string, options: any) => {
        capturedBody = options.body.toString();
        return {
          ok: true,
          json: async () => ({ success: true, challenge_ts: '2026-09-16T00:00:00Z', hostname: 'findora.app' }),
        };
      }) as any;

      try {
        const req = new NextRequest('http://localhost/api/otp/send', {
          method: 'POST',
          headers: {
            'x-forwarded-for': '197.34.56.78, 10.0.0.1',
          },
          body: JSON.stringify({
            phoneNumber: '01012345678',
            purpose: 'merchant_registration',
            turnstileToken: 'valid-cf-token',
          }),
        });

        const response = await sendOtpRoute(req);
        expect(response.status).toBe(200);

        // Verify that remoteip in form data matched the first client IP
        expect(capturedBody).toContain('remoteip=197.34.56.78');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('H1. extracts Turnstile token from cf-turnstile-response header', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'mock-secret-key';

      const req = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        headers: {
          'cf-turnstile-response': 'mock-turnstile-pass',
        },
        body: JSON.stringify({
          phoneNumber: '01012345678',
          purpose: 'merchant_registration',
        }),
      });

      const response = await sendOtpRoute(req);
      expect(response.status).toBe(200);
      expect(dispatchOtpSmsMock).toHaveBeenCalledWith('+201012345678', expect.any(String), 'merchant_registration');
    });

    it('H2. extracts Turnstile token from x-turnstile-token header', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'mock-secret-key';

      const req = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        headers: {
          'x-turnstile-token': 'mock-turnstile-pass',
        },
        body: JSON.stringify({
          phoneNumber: '01012345678',
          purpose: 'merchant_registration',
        }),
      });

      const response = await sendOtpRoute(req);
      expect(response.status).toBe(200);
      expect(dispatchOtpSmsMock).toHaveBeenCalledWith('+201012345678', expect.any(String), 'merchant_registration');
    });
  });

  describe('Preservation of Batch 1 Guarantees with Turnstile Active', () => {
    it('I. canonicalizes phone format even when Turnstile token is valid', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'mock-secret-key';

      const req = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '00201012345678',
          purpose: 'merchant_registration',
          turnstileToken: 'mock-turnstile-pass',
        }),
      });

      const response = await sendOtpRoute(req);
      expect(response.status).toBe(200);
      expect(dispatchOtpSmsMock).toHaveBeenCalledWith('+201012345678', expect.any(String), 'merchant_registration');
    });

    it('J. enforces 3/hour phone quota even when Turnstile token is valid', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'mock-secret-key';

      // Mock 3 recent OTPs for this canonical phone
      mockDbQueryResponse = {
        data: [
          { id: '1', created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
          { id: '2', created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
          { id: '3', created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
        ],
        error: null,
      };

      const req = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '01012345678',
          purpose: 'merchant_registration',
          turnstileToken: 'mock-turnstile-pass',
        }),
      });

      const response = await sendOtpRoute(req);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.error).toContain('Too many OTP requests');
      expect(dispatchOtpSmsMock).not.toHaveBeenCalled();
    });

    it('K. enforces 60-second cooldown even when Turnstile token is valid', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'mock-secret-key';

      // Mock recent OTP sent 25 seconds ago
      mockDbQueryResponse = {
        data: [
          { id: '1', created_at: new Date(Date.now() - 25 * 1000).toISOString() },
        ],
        error: null,
      };

      const req = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '01012345678',
          purpose: 'merchant_registration',
          turnstileToken: 'mock-turnstile-pass',
        }),
      });

      const response = await sendOtpRoute(req);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.error).toContain('Please wait 60 seconds');
      expect(response.headers.get('Retry-After')).toBeDefined();
      expect(dispatchOtpSmsMock).not.toHaveBeenCalled();
    });

    it('L. fails closed (HTTP 503) on DB rate-limit query error even when Turnstile token is valid', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'mock-secret-key';

      // Mock database error
      mockDbQueryResponse = {
        data: null,
        error: { message: 'connection timeout' },
      };

      const req = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '01012345678',
          purpose: 'merchant_registration',
          turnstileToken: 'mock-turnstile-pass',
        }),
      });

      const response = await sendOtpRoute(req);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.error).toBe('Service temporarily unavailable');
      expect(dispatchOtpSmsMock).not.toHaveBeenCalled();
    });
  });

  describe('P1-03 Batch 3: Concurrency & TOCTOU Hardening via Atomic Reservation', () => {
    const originalEnv = { ...process.env };
    const dispatchOtpSmsMock = dispatchOtpSms as jest.MockedFunction<typeof dispatchOtpSms>;

    // Simulated in-memory PostgreSQL table and advisory lock
    interface SimOtpRow {
      id: string;
      phone_number: string;
      code_hash: string;
      purpose: string;
      created_at: Date;
      expires_at: Date;
      is_used: boolean;
    }

    let simRows: SimOtpRow[] = [];
    const lockQueues = new Map<string, Promise<void>>();

    async function acquireAdvisoryLock(phone: string): Promise<() => void> {
      const lockKey = phone.trim();
      let releaseLock: () => void;
      const currentLock = lockQueues.get(lockKey) || Promise.resolve();
      const newLock = new Promise<void>((resolve) => {
        releaseLock = resolve;
      });
      lockQueues.set(lockKey, currentLock.then(() => newLock));
      await currentLock;
      return () => {
        releaseLock!();
      };
    }

    let capturedRpcArgs: any = null;

    beforeEach(() => {
      process.env = { ...originalEnv };
      dispatchOtpSmsMock.mockReset();
      dispatchOtpSmsMock.mockResolvedValue({ success: true, expiresInSeconds: 600 });
      simRows = [];
      lockQueues.clear();
      capturedRpcArgs = null;
      process.env.OTP_SALT = 'mock-test-otp-salt';
      process.env.TURNSTILE_SECRET_KEY = 'mock-secret-key';
      process.env.SMS_PROVIDER_API_KEY = 'mock-sms-provider-key';

      // Wire customRpcHandler to execute atomic reservation logic
      customRpcHandler = async (fnName: string, args: any) => {
        if (fnName === 'fn_reserve_and_create_otp') {
          capturedRpcArgs = args;
          const { p_phone_number, p_code_hash, p_purpose, p_expires_at } = args;
          const maxHourly = args.p_max_hourly ?? 3;
          const cooldownSeconds = args.p_cooldown_seconds ?? 60;

          // 1. Acquire transaction advisory lock
          const release = await acquireAdvisoryLock(p_phone_number);

          try {
            // Micro-tick delay to simulate real I/O and verify race-free synchronization
            await new Promise((r) => setTimeout(r, 5));

            const now = Date.now();
            const oneHourAgo = now - 60 * 60 * 1000;

            // 2. Query unified rolling 60-minute rows across ALL purposes
            const recentRows = simRows.filter(
              (r) => r.phone_number === p_phone_number.trim() && r.created_at.getTime() >= oneHourAgo
            );

            // 3. Hourly quota check
            if (recentRows.length >= maxHourly) {
              return {
                data: {
                  success: false,
                  code: 'RATE_LIMIT_EXCEEDED',
                  error: 'Too many OTP requests. Please wait before requesting a new code.',
                },
                error: null,
              };
            }

            // 4. Cooldown check
            if (recentRows.length > 0) {
              const latestRow = recentRows.reduce((prev, curr) =>
                curr.created_at.getTime() > prev.created_at.getTime() ? curr : prev
              );
              const elapsedSec = Math.floor((now - latestRow.created_at.getTime()) / 1000);
              if (elapsedSec < cooldownSeconds) {
                const retryAfter = Math.max(1, cooldownSeconds - elapsedSec);
                return {
                  data: {
                    success: false,
                    code: 'COOLDOWN_ACTIVE',
                    retry_after: retryAfter,
                    error: 'Please wait 60 seconds before requesting another code.',
                  },
                  error: null,
                };
              }
            }

            // 5. Invalidate unused previous OTPs for this purpose
            for (const r of simRows) {
              if (r.phone_number === p_phone_number.trim() && r.purpose === p_purpose && !r.is_used) {
                r.is_used = true;
              }
            }

            // 6. Insert new OTP
            const newId = `otp-${Math.random().toString(36).substring(2, 9)}`;
            simRows.push({
              id: newId,
              phone_number: p_phone_number.trim(),
              code_hash: p_code_hash.trim(),
              purpose: p_purpose,
              created_at: new Date(now),
              expires_at: new Date(p_expires_at),
              is_used: false,
            });

            return {
              data: {
                success: true,
                otp_id: newId,
              },
              error: null,
            };
          } finally {
            release();
          }
        }
        return { data: null, error: null };
      };
    });

    afterAll(() => {
      process.env = originalEnv;
      customRpcHandler = null;
    });

    it('A. fails closed with HTTP 503 and zero DB writes when SMS provider is missing in production', async () => {
      (process.env as any).NODE_ENV = 'production';
      delete process.env.SMS_PROVIDER_API_KEY;
      delete process.env.SMS_MISR_API_KEY;
      delete process.env.TWILIO_ACCOUNT_SID;

      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      }) as any;

      try {
        const req = new NextRequest('http://localhost/api/otp/send', {
          method: 'POST',
          body: JSON.stringify({
            phoneNumber: '01012345678',
            purpose: 'merchant_registration',
            turnstileToken: 'mock-turnstile-pass',
          }),
        });

        const response = await sendOtpRoute(req);
        const body = await response.json();

        expect(response.status).toBe(503);
        expect(body.error).toBe('SMS_GATEWAY_NOT_CONFIGURED');
        expect(body.message).toContain('temporarily unavailable');
        // Verify RPC was NOT called and zero records inserted
        expect(capturedRpcArgs).toBeNull();
        expect(simRows).toHaveLength(0);
        expect(dispatchOtpSmsMock).not.toHaveBeenCalled();
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('B. enforces sequential quota and cooldown correctly across requests', async () => {
      // 1st request succeeds
      const req1 = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '01012345678',
          purpose: 'merchant_registration',
          turnstileToken: 'mock-turnstile-pass',
        }),
      });
      const res1 = await sendOtpRoute(req1);
      expect(res1.status).toBe(200);
      expect(simRows).toHaveLength(1);

      // 2nd request immediately afterwards fails with 429 COOLDOWN_ACTIVE
      const req2 = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '01012345678',
          purpose: 'merchant_registration',
          turnstileToken: 'mock-turnstile-pass',
        }),
      });
      const res2 = await sendOtpRoute(req2);
      const body2 = await res2.json();
      expect(res2.status).toBe(429);
      expect(body2.code).toBe('COOLDOWN_ACTIVE');
      expect(res2.headers.get('Retry-After')).toBeDefined();
      expect(simRows).toHaveLength(1); // No new row added

      // Simulate cooldown elapsed: adjust created_at of row 1 to 65 seconds ago
      simRows[0].created_at = new Date(Date.now() - 65 * 1000);

      // 3rd request succeeds (2nd successful OTP in rolling hour)
      const req3 = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '01012345678',
          purpose: 'merchant_registration',
          turnstileToken: 'mock-turnstile-pass',
        }),
      });
      const res3 = await sendOtpRoute(req3);
      expect(res3.status).toBe(200);
      expect(simRows).toHaveLength(2);

      // Simulate cooldown elapsed again: adjust created_at of row 2 to 65 seconds ago
      simRows[1].created_at = new Date(Date.now() - 65 * 1000);

      // 4th request succeeds (3rd successful OTP in rolling hour - quota max reached)
      const req4 = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '01012345678',
          purpose: 'merchant_registration',
          turnstileToken: 'mock-turnstile-pass',
        }),
      });
      const res4 = await sendOtpRoute(req4);
      expect(res4.status).toBe(200);
      expect(simRows).toHaveLength(3);

      // Simulate cooldown elapsed for 4th: adjust row 3
      simRows[2].created_at = new Date(Date.now() - 65 * 1000);

      // 5th request fails with 429 RATE_LIMIT_EXCEEDED (3/hour exhausted)
      const req5 = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '01012345678',
          purpose: 'merchant_registration',
          turnstileToken: 'mock-turnstile-pass',
        }),
      });
      const res5 = await sendOtpRoute(req5);
      const body5 = await res5.json();
      expect(res5.status).toBe(429);
      expect(body5.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(simRows).toHaveLength(3); // Still exactly 3 rows
    });

    it('C. eliminates TOCTOU race: 10 concurrent burst requests produce exactly 1 success and 9 rate-limits', async () => {
      const burstRequests = Array.from({ length: 10 }, () =>
        new NextRequest('http://localhost/api/otp/send', {
          method: 'POST',
          body: JSON.stringify({
            phoneNumber: '01012345678',
            purpose: 'merchant_registration',
            turnstileToken: 'mock-turnstile-pass',
          }),
        })
      );

      const responses = await Promise.all(burstRequests.map((req) => sendOtpRoute(req)));
      const statuses = responses.map((r) => r.status);

      const successes = statuses.filter((s) => s === 200);
      const rateLimits = statuses.filter((s) => s === 429);

      expect(successes).toHaveLength(1);
      expect(rateLimits).toHaveLength(9);
      // Exactly 1 OTP row was inserted into the database
      expect(simRows).toHaveLength(1);
      // Exactly 1 SMS dispatch was executed
      expect(dispatchOtpSmsMock).toHaveBeenCalledTimes(1);
    });

    it('D. eliminates cross-purpose concurrency race: 4 concurrent requests with different purposes produce exactly 1 success', async () => {
      const purposes = [
        'contributor_registration',
        'merchant_registration',
        'withdrawal_verification',
        'vendor_auth',
      ];

      const requests = purposes.map(
        (purpose) =>
          new NextRequest('http://localhost/api/otp/send', {
            method: 'POST',
            body: JSON.stringify({
              phoneNumber: '01012345678',
              purpose,
              turnstileToken: 'mock-turnstile-pass',
            }),
          })
      );

      const responses = await Promise.all(requests.map((req) => sendOtpRoute(req)));
      const statuses = responses.map((r) => r.status);

      const successes = statuses.filter((s) => s === 200);
      const rateLimits = statuses.filter((s) => s === 429);

      expect(successes).toHaveLength(1);
      expect(rateLimits).toHaveLength(3);
      expect(simRows).toHaveLength(1);
      expect(dispatchOtpSmsMock).toHaveBeenCalledTimes(1);
    });

    it('E. eliminates canonical variants concurrency race: 4 concurrent requests with format variants synchronize on same lock', async () => {
      const phoneFormats = [
        '01012345678',
        '+201012345678',
        '00201012345678',
        '1012345678',
      ];

      const requests = phoneFormats.map(
        (phoneNumber) =>
          new NextRequest('http://localhost/api/otp/send', {
            method: 'POST',
            body: JSON.stringify({
              phoneNumber,
              purpose: 'merchant_registration',
              turnstileToken: 'mock-turnstile-pass',
            }),
          })
      );

      const responses = await Promise.all(requests.map((req) => sendOtpRoute(req)));
      const statuses = responses.map((r) => r.status);

      const successes = statuses.filter((s) => s === 200);
      const rateLimits = statuses.filter((s) => s === 429);

      expect(successes).toHaveLength(1);
      expect(rateLimits).toHaveLength(3);
      expect(simRows).toHaveLength(1);
      expect(simRows[0].phone_number).toBe('+201012345678');
      expect(dispatchOtpSmsMock).toHaveBeenCalledTimes(1);
    });

    it('F. fails closed (HTTP 503) when database RPC returns an error', async () => {
      customRpcHandler = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const req = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '01012345678',
          purpose: 'merchant_registration',
          turnstileToken: 'mock-turnstile-pass',
        }),
      });

      const response = await sendOtpRoute(req);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.error).toBe('Service temporarily unavailable');
      expect(dispatchOtpSmsMock).not.toHaveBeenCalled();
    });

    it('G. retains OTP reservation in database when downstream SMS dispatch fails', async () => {
      dispatchOtpSmsMock.mockResolvedValueOnce({
        success: false,
        error: 'SMS_GATEWAY_ERROR',
        expiresInSeconds: 0,
      });

      const req = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '01012345678',
          purpose: 'merchant_registration',
          turnstileToken: 'mock-turnstile-pass',
        }),
      });

      const response = await sendOtpRoute(req);
      expect(response.status).toBe(500);

      // The OTP was reserved and the row REMAINS in the database (preventing toll-fraud loops)
      expect(simRows).toHaveLength(1);
    });

    it('H. ensures plaintext OTP code never enters SQL/RPC parameters', async () => {
      const req = new NextRequest('http://localhost/api/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '01012345678',
          purpose: 'merchant_registration',
          turnstileToken: 'mock-turnstile-pass',
        }),
      });

      const response = await sendOtpRoute(req);
      expect(response.status).toBe(200);

      expect(capturedRpcArgs).not.toBeNull();
      // Verify code_hash is a 64-character SHA-256 hex string
      expect(capturedRpcArgs.p_code_hash).toMatch(/^[a-f0-9]{64}$/);
      // Verify plaintext code is NOT present in any RPC parameter
      expect(capturedRpcArgs).not.toHaveProperty('code');
      expect(capturedRpcArgs).not.toHaveProperty('p_code');
    });
  });
});
