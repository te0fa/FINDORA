import { checkRateLimit } from '@/proxy';
import { createAdminClient } from '@/lib/supabase/admin';

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

describe('Supabase-backed Rate Limiter', () => {
  const ip = '192.168.1.100';
  const path = '/api/ai/pricing';
  const limit = 5;
  const windowSeconds = 60;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates new window and allows request when no active window exists', async () => {
    const mockUpsert = jest.fn().mockResolvedValue({ error: null });
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'No rows' } }),
          }),
        }),
      }),
      upsert: mockUpsert,
    });

    (createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const result = await checkRateLimit(ip, path, limit, windowSeconds);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(limit - 1);
    expect(mockUpsert).toHaveBeenCalled();
  });

  test('increments counter and allows request when within rate limit', async () => {
    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { request_count: 2, window_start: new Date().toISOString() },
              error: null,
            }),
          }),
        }),
      }),
      update: mockUpdate,
    });

    (createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const result = await checkRateLimit(ip, path, limit, windowSeconds);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(limit - 2 - 1);
    expect(mockUpdate).toHaveBeenCalledWith({ request_count: 3 });
  });

  test('blocks request with allowed=false when limit is reached or exceeded', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { request_count: limit, window_start: new Date().toISOString() },
              error: null,
            }),
          }),
        }),
      }),
    });

    (createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const result = await checkRateLimit(ip, path, limit, windowSeconds);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.status).toBe(429);
  });

  describe('P0-02: Database Fail-Closed Protection', () => {
    test('fails closed with allowed=false and status=503 when DB select throws', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockImplementation(() => {
          throw new Error('Database connection timeout');
        }),
      });

      (createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await checkRateLimit(ip, path, limit, windowSeconds);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.status).toBe(503);
    });

    test('fails closed with allowed=false and status=503 when DB select returns unexpected error', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'ECONNREFUSED', message: 'Connection refused' },
              }),
            }),
          }),
        }),
      });

      (createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await checkRateLimit(ip, path, limit, windowSeconds);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.status).toBe(503);
    });

    test('fails closed with allowed=false and status=503 when DB upsert fails', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'No rows found' },
              }),
            }),
          }),
        }),
        upsert: jest.fn().mockResolvedValue({
          error: { code: '42501', message: 'Permission denied on upsert' },
        }),
      });

      (createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await checkRateLimit(ip, path, limit, windowSeconds);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.status).toBe(503);
    });

    test('fails closed with allowed=false and status=503 when DB update fails', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { request_count: 1, window_start: new Date().toISOString() },
                error: null,
              }),
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: { code: 'XX000', message: 'Database disk full on update' },
          }),
        }),
      });

      (createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await checkRateLimit(ip, path, limit, windowSeconds);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.status).toBe(503);
    });
  });

  describe('P0-02: Rate Limit Threshold Invariants', () => {
    // Dynamic import to test getRateLimitConfig
    const { getRateLimitConfig } = require('@/proxy');

    test('retains strict Auth / OTP rate limits (10 req / 60s)', () => {
      expect(getRateLimitConfig('/api/otp/send')).toEqual({ limit: 10, windowSeconds: 60 });
      expect(getRateLimitConfig('/api/otp/verify')).toEqual({ limit: 10, windowSeconds: 60 });
      expect(getRateLimitConfig('/auth/login')).toEqual({ limit: 10, windowSeconds: 60 });
      expect(getRateLimitConfig('/en/auth/login')).toEqual({ limit: 10, windowSeconds: 60 });
    });

    test('retains strict AI rate limits (10 req / 60s)', () => {
      expect(getRateLimitConfig('/api/ai/parse-request')).toEqual({ limit: 10, windowSeconds: 60 });
      expect(getRateLimitConfig('/api/ai/pricing')).toEqual({ limit: 10, windowSeconds: 60 });
      expect(getRateLimitConfig('/api/pricing/resolve')).toEqual({ limit: 10, windowSeconds: 60 });
      expect(getRateLimitConfig('/ar/api/ai/pricing')).toEqual({ limit: 10, windowSeconds: 60 });
    });

    test('retains dedicated Customer Request Creation rate limits (5 req / 600s)', () => {
      expect(getRateLimitConfig('/api/customers/requests/create')).toEqual({ limit: 5, windowSeconds: 600 });
      expect(getRateLimitConfig('/en/api/customers/requests/create')).toEqual({ limit: 5, windowSeconds: 600 });
      expect(getRateLimitConfig('/ar/api/customers/requests/create')).toEqual({ limit: 5, windowSeconds: 600 });
    });

    test('retains general API rate limits (1000 req / 60s)', () => {
      expect(getRateLimitConfig('/api/other-endpoint')).toEqual({ limit: 1000, windowSeconds: 60 });
      expect(getRateLimitConfig('/api/products/search')).toEqual({ limit: 1000, windowSeconds: 60 });
    });

    test('retains exempt webhooks rate limits (500 req / 60s)', () => {
      expect(getRateLimitConfig('/api/webhooks/paymob')).toEqual({ limit: 500, windowSeconds: 60 });
      expect(getRateLimitConfig('/api/webhooks/vendors/inbound')).toEqual({ limit: 500, windowSeconds: 60 });
    });
  });
});
