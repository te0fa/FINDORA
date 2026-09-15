/**
 * P0-01-A — Fail-Closed OTP & Production Safety Unit Tests
 *
 * Verifies:
 * 1. getOtpSalt() fails closed in production when OTP_SALT is missing.
 * 2. isSmsProviderConfigured() correctly identifies missing / present provider configurations.
 * 3. sendOtp() in production with no SMS provider returns SMS_GATEWAY_NOT_CONFIGURED and skips DB insert.
 * 4. sendOtp() in production never leaks devCode.
 * 5. sendOtp() in dev mode works with dev fallback salt and returns devCode.
 * 6. POST /api/otp/send returns HTTP 503 on SMS_GATEWAY_NOT_CONFIGURED.
 * 7. POST /api/otp/send returns HTTP 500 on OTP_CONFIGURATION_ERROR.
 */

import { getOtpSalt, isSmsProviderConfigured, sendOtp } from '@/lib/notifications/otp';
import { POST as sendOtpRoute } from '@/app/api/otp/send/route';
import { NextRequest } from 'next/server';

// Mock the logger to keep test output clean
jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock Supabase admin client for route testing
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockSelect = jest.fn();

const mockAdminClient = {
  from: jest.fn(() => {
    const queryBuilder: any = {
      insert: mockInsert,
      update: () => ({
        eq: () => ({
          eq: () => ({
            eq: mockUpdate,
          }),
        }),
      }),
      select: jest.fn(() => queryBuilder),
      eq: jest.fn(() => queryBuilder),
      gte: jest.fn(() => queryBuilder),
      order: jest.fn(() => mockSelect()),
      then: (resolve: any, reject: any) => Promise.resolve(mockSelect()).then(resolve, reject),
    };
    return queryBuilder;
  }),
  rpc: jest.fn(),
};

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => mockAdminClient),
}));

describe('P0-01-A: OTP Salt Safety (getOtpSalt)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('throws CRITICAL_SECURITY_ERROR in production when OTP_SALT is missing', () => {
    (process.env as any).NODE_ENV = 'production';
    delete process.env.OTP_SALT;

    expect(() => getOtpSalt()).toThrow('CRITICAL_SECURITY_ERROR: OTP_SALT environment variable is required in production');
  });

  it('returns configured OTP_SALT in production when present', () => {
    (process.env as any).NODE_ENV = 'production';
    process.env.OTP_SALT = 'prod_secret_salt_xyz';

    expect(getOtpSalt()).toBe('prod_secret_salt_xyz');
  });

  it('returns test fallback salt in non-production when OTP_SALT is missing', () => {
    (process.env as any).NODE_ENV = 'test';
    delete process.env.OTP_SALT;

    expect(getOtpSalt()).toBe('dev_test_otp_salt_do_not_use_in_prod');
  });
});

describe('P0-01-A: SMS Provider Configuration (isSmsProviderConfigured)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SMS_MISR_API_KEY;
    delete process.env.SMS_MISR_SENDER_ID;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_PHONE_NUMBER;
    delete process.env.SMS_PROVIDER_API_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns false when no SMS provider env vars are set', () => {
    expect(isSmsProviderConfigured()).toBe(false);
  });

  it('returns true when SMS Misr credentials are set', () => {
    process.env.SMS_MISR_API_KEY = 'test_key';
    process.env.SMS_MISR_SENDER_ID = 'FINDORA';
    expect(isSmsProviderConfigured()).toBe(true);
  });

  it('returns true when Twilio credentials are set', () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC_test';
    process.env.TWILIO_AUTH_TOKEN = 'token_test';
    process.env.TWILIO_PHONE_NUMBER = '+1234567890';
    expect(isSmsProviderConfigured()).toBe(true);
  });

  it('returns true when generic SMS_PROVIDER_API_KEY is set', () => {
    process.env.SMS_PROVIDER_API_KEY = 'generic_key_xyz';
    expect(isSmsProviderConfigured()).toBe(true);
  });
});

describe('P0-01-A: sendOtp Fail-Closed Behavior', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.SMS_MISR_API_KEY;
    delete process.env.SMS_MISR_SENDER_ID;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_PHONE_NUMBER;
    delete process.env.SMS_PROVIDER_API_KEY;
    mockInsert.mockReset();
    mockUpdate.mockReset();
    mockSelect.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('in production with no provider: fails closed with SMS_GATEWAY_NOT_CONFIGURED before DB insert', async () => {
    (process.env as any).NODE_ENV = 'production';
    process.env.OTP_SALT = 'prod_salt_123';

    const result = await sendOtp('01012345678', 'vendor_auth', mockAdminClient);

    expect(result.success).toBe(false);
    expect(result.error).toBe('SMS_GATEWAY_NOT_CONFIGURED');
    expect(result.expiresInSeconds).toBe(0);
    expect(result.devCode).toBeUndefined();

    // Verify DB insert was NOT called (no dead rows created)
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('in production with missing OTP_SALT: returns OTP_CONFIGURATION_ERROR', async () => {
    (process.env as any).NODE_ENV = 'production';
    delete process.env.OTP_SALT;
    // Set provider so it gets past provider check to salt check
    process.env.SMS_PROVIDER_API_KEY = 'test_key';

    mockUpdate.mockResolvedValue({ error: null });

    const result = await sendOtp('01012345678', 'vendor_auth', mockAdminClient);

    expect(result.success).toBe(false);
    expect(result.error).toBe('OTP_CONFIGURATION_ERROR');
  });

  it('in production with provider configured: sends OTP and never returns devCode', async () => {
    (process.env as any).NODE_ENV = 'production';
    process.env.OTP_SALT = 'prod_salt_123';
    process.env.SMS_PROVIDER_API_KEY = 'test_key';

    mockUpdate.mockResolvedValue({ error: null });
    mockInsert.mockResolvedValue({ error: null });

    const result = await sendOtp('01012345678', 'vendor_auth', mockAdminClient);

    expect(result.success).toBe(true);
    expect(result.expiresInSeconds).toBe(600);
    expect(result.isDev).toBe(false);
    expect(result.devCode).toBeUndefined();
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('in development: succeeds and provides devCode for local testing', async () => {
    (process.env as any).NODE_ENV = 'development';
    delete process.env.OTP_SALT; // Dev fallback salt will be used

    mockUpdate.mockResolvedValue({ error: null });
    mockInsert.mockResolvedValue({ error: null });

    const result = await sendOtp('01012345678', 'vendor_auth', mockAdminClient);

    expect(result.success).toBe(true);
    expect(result.isDev).toBe(true);
    expect(result.devCode).toMatch(/^\d{6}$/);
  });
});

describe('P0-01-A: POST /api/otp/send Route Handler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.SMS_MISR_API_KEY;
    delete process.env.SMS_MISR_SENDER_ID;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_PHONE_NUMBER;
    delete process.env.SMS_PROVIDER_API_KEY;
    mockInsert.mockReset();
    mockUpdate.mockReset();
    mockSelect.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns HTTP 503 and SMS_GATEWAY_NOT_CONFIGURED in production when provider is missing', async () => {
    (process.env as any).NODE_ENV = 'production';
    process.env.OTP_SALT = 'prod_salt_123';

    // Rate limit check: return 0 recent OTPs
    mockSelect.mockResolvedValue({ data: [] });

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
    expect(body.error).toBe('SMS_GATEWAY_NOT_CONFIGURED');
    expect(body.message).toContain('temporarily unavailable');
    expect(body.devCode).toBeUndefined();
  });

  it('returns HTTP 500 when OTP_SALT is missing in production', async () => {
    (process.env as any).NODE_ENV = 'production';
    delete process.env.OTP_SALT;
    process.env.SMS_PROVIDER_API_KEY = 'test_key';

    mockSelect.mockResolvedValue({ data: [] });
    mockUpdate.mockResolvedValue({ error: null });

    const req = new NextRequest('http://localhost/api/otp/send', {
      method: 'POST',
      body: JSON.stringify({
        phoneNumber: '01012345678',
        purpose: 'vendor_auth',
      }),
    });

    const response = await sendOtpRoute(req);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('OTP_CONFIGURATION_ERROR');
    expect(body.devCode).toBeUndefined();
  });

  it('in development: returns HTTP 200 with devCode for developer convenience', async () => {
    (process.env as any).NODE_ENV = 'development';
    mockSelect.mockResolvedValue({ data: [] });
    mockUpdate.mockResolvedValue({ error: null });
    mockInsert.mockResolvedValue({ error: null });

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
    expect(body.devCode).toMatch(/^\d{6}$/);
  });
});
