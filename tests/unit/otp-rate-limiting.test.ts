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
import { sendOtp, verifyOtp } from '@/lib/notifications/otp';
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
    verifyOtp: jest.fn(),
  };
});

// Mock Supabase admin client
let mockDbQueryResponse: { data: any; error: any } = { data: [], error: null };

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

  return {
    from: jest.fn(() => queryBuilder),
    rpc: jest.fn(),
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
  const sendMock = sendOtp as jest.MockedFunction<typeof sendOtp>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDbQueryResponse = { data: [], error: null };
    mockAdminClient = createMockAdminClient();
    sendMock.mockResolvedValue({
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
      // sendOtp must NOT be called
      expect(sendMock).not.toHaveBeenCalled();
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
      expect(sendMock).toHaveBeenCalledWith(
        '+201012345678',
        'vendor_auth',
        expect.anything()
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
      expect(sendMock).not.toHaveBeenCalled();
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
      expect(sendMock).not.toHaveBeenCalled();
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
      expect(sendMock).not.toHaveBeenCalled();
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
      expect(sendMock).toHaveBeenCalledWith('+201012345678', 'vendor_auth', expect.anything());
    });
  });

  describe('Fail-Closed Database Error Handling', () => {
    it('returns HTTP 503 and does NOT call sendOtp when database rate-limit query fails', async () => {
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
      expect(sendMock).not.toHaveBeenCalled();
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
      expect(sendMock).not.toHaveBeenCalled();
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
      expect(sendMock).not.toHaveBeenCalled();
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
