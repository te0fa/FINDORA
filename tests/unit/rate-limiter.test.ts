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
  });
});
