import { acquireLock, releaseLock } from '@/lib/utils/checkoutLock';
import { createAdminClient } from '@/lib/supabase/admin';

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

describe('Checkout Locking Mechanism', () => {
  const requestId = 'req_test_checkout_123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('successfully acquires lock on first submission', async () => {
    const mockInsert = jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({ data: { request_id: requestId }, error: null }),
    });

    const mockFrom = jest.fn().mockReturnValue({
      insert: mockInsert,
    });

    (createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const acquired = await acquireLock(requestId);
    expect(acquired).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('checkout_locks');
  });

  test('rejects lock acquisition on duplicate submission (code 23505 unique violation)', async () => {
    const mockInsert = jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
      }),
    });

    const mockFrom = jest.fn().mockReturnValue({
      insert: mockInsert,
    });

    (createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom });

    const acquired = await acquireLock(requestId);
    expect(acquired).toBe(false);
  });

  test('releases lock after checkout completion or failure', async () => {
    const mockDelete = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    const mockFrom = jest.fn().mockReturnValue({
      delete: mockDelete,
    });

    (createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom });

    await releaseLock(requestId);
    expect(mockFrom).toHaveBeenCalledWith('checkout_locks');
    expect(mockDelete).toHaveBeenCalled();
  });
});
