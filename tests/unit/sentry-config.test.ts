import { sentryClientConfig } from '@/sentry.client.config';
import { sentryServerConfig } from '@/sentry.server.config';

describe('Sentry configuration', () => {
  test('client config has correct sampling rate', () => {
    expect(sentryClientConfig.tracesSampleRate).toBeCloseTo(0.05);
  });

  test('server config has correct sampling rate', () => {
    expect(sentryServerConfig.tracesSampleRate).toBeCloseTo(0.1);
  });
});
