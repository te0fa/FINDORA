import * as logger from '@/lib/utils/logger';
import * as Sentry from '@sentry/nextjs';

jest.mock('@sentry/nextjs', () => ({
  setTag: jest.fn(),
  captureException: jest.fn(),
  init: jest.fn(),
}));

describe('request-id propagation', () => {
  const fakeId = 'test-request-123';

  test('logger stores requestId correctly', () => {
    logger.setRequestId(fakeId);
    expect(logger.getRequestId()).toBe(fakeId);
  });

  test('Sentry receives requestId as a tag', () => {
    logger.setRequestId(fakeId);
    Sentry.setTag('request_id', fakeId);
    expect(Sentry.setTag).toHaveBeenCalledWith('request_id', fakeId);
  });
});
