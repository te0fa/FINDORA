/**
 * P0-01-B — Vendor Email Authentication & Login Remediation Unit Tests
 *
 * Verifies:
 * 1. Vendor registration with real email + password (no OTP, no synthetic email).
 * 2. Input validations (email, weak password, primary phone).
 * 3. Duplicate phone / duplicate email handling.
 * 4. Compensation on RPC failure (auth user deleted).
 * 5. Vendor login with real email + password.
 * 6. Inactive/Suspended vendor login rejection.
 * 7. Absence of OTP calls and absence of listUsers() calls.
 * 8. Zero password leakage in responses.
 */

import { NextRequest } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockAdminCreateUser = jest.fn()
const mockAdminDeleteUser = jest.fn()
const mockAdminListUsers = jest.fn()
const mockSignInWithPassword = jest.fn()
const mockSignOut = jest.fn()
const mockRpc = jest.fn()
const mockFrom = jest.fn()
const mockVerifyOtp = jest.fn()
const mockSendOtp = jest.fn()

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}))

jest.mock('@/lib/middleware/rate-limiter', () => ({
  withRateLimit: (_: any, handler: any) => handler,
  VENDOR_REGISTRATION_RATE_LIMIT: {},
}))

jest.mock('@/lib/notifications/otp', () => ({
  verifyOtp: mockVerifyOtp,
  sendOtp: mockSendOtp,
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
    },
  })),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    auth: {
      admin: {
        createUser: mockAdminCreateUser,
        deleteUser: mockAdminDeleteUser,
        listUsers: mockAdminListUsers,
      },
    },
    from: mockFrom,
    rpc: mockRpc,
  })),
}))

import { POST as registerHandler } from '@/app/api/vendor/register/route'
import { POST as loginHandler } from '@/app/api/vendor/login/route'
import { requiresAuth } from '@/proxy'

function makeChain(terminal: Record<string, jest.Mock>) {
  const chain: Record<string, any> = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    maybeSingle: terminal.maybeSingle ?? jest.fn(),
    single: terminal.single ?? jest.fn(),
  }
  chain.select.mockReturnThis = () => chain
  chain.eq.mockReturnThis = () => chain
  chain.update.mockReturnThis = () => chain
  return chain
}

describe('P0-01-B: Vendor Registration (/api/vendor/register)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const validBody = {
    businessNameAr: 'شركة الأمل للتوريدات',
    businessNameEn: 'Al Amal Supplies',
    merchantType: 'wholesaler',
    category: 'الإلكترونيات والموبايلات',
    governorate: 'القاهرة',
    city: 'مدينة نصر',
    area: 'المنطقة الأولى',
    address: 'شارع الطيران 15',
    primaryPhone: '01012345678',
    email: 'vendor@alamal.com',
    password: 'SecurePassword123!',
  }

  it('1. Successfully registers vendor with real email & password without OTP', async () => {
    // Duplicate phone check: not found
    const phoneChain = makeChain({ maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) })
    // Duplicate email check: not found
    const emailChain = makeChain({ maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) })
    // Update portal_email chain
    const updateChain = makeChain({ eq: jest.fn().mockResolvedValue({ data: null, error: null }) })

    mockFrom
      .mockReturnValueOnce(phoneChain)
      .mockReturnValueOnce(emailChain)
      .mockReturnValueOnce(updateChain)

    mockAdminCreateUser.mockResolvedValue({
      data: { user: { id: 'auth-user-uuid-123', email: 'vendor@alamal.com' } },
      error: null,
    })

    mockRpc.mockResolvedValue({ data: 'vendor-uuid-789', error: null })

    const req = new NextRequest('http://localhost/api/vendor/register', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })

    const res = await registerHandler(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.success).toBe(true)
    expect(body.id).toBe('vendor-uuid-789')

    // Verify Supabase Auth user was created with the real email
    expect(mockAdminCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'vendor@alamal.com',
        password: 'SecurePassword123!',
        email_confirm: true,
      })
    )

    // Verify fn_register_vendor received real email and authUserId
    expect(mockRpc).toHaveBeenCalledWith(
      'fn_register_vendor',
      expect.objectContaining({
        p_email: 'vendor@alamal.com',
        p_auth_user_id: 'auth-user-uuid-123',
        p_primary_phone: '01012345678',
      })
    )

    // Verify NO OTP function was called
    expect(mockVerifyOtp).not.toHaveBeenCalled()
    expect(mockSendOtp).not.toHaveBeenCalled()

    // Verify NO listUsers() was called
    expect(mockAdminListUsers).not.toHaveBeenCalled()
  })

  it('2. Rejects registration when email is missing or invalid', async () => {
    const invalidEmailBody = { ...validBody, email: 'not-an-email' }
    const req = new NextRequest('http://localhost/api/vendor/register', {
      method: 'POST',
      body: JSON.stringify(invalidEmailBody),
    })

    const res = await registerHandler(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toContain('Invalid email address')
    expect(mockAdminCreateUser).not.toHaveBeenCalled()
  })

  it('3. Rejects registration when password is weak (< 6 chars)', async () => {
    const weakPassBody = { ...validBody, password: '123' }
    const req = new NextRequest('http://localhost/api/vendor/register', {
      method: 'POST',
      body: JSON.stringify(weakPassBody),
    })

    const res = await registerHandler(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toContain('Password must be at least 6 characters')
    expect(mockAdminCreateUser).not.toHaveBeenCalled()
  })

  it('4. Rejects registration when primary phone is missing or invalid', async () => {
    const invalidPhoneBody = { ...validBody, primaryPhone: '12345' }
    const req = new NextRequest('http://localhost/api/vendor/register', {
      method: 'POST',
      body: JSON.stringify(invalidPhoneBody),
    })

    const res = await registerHandler(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toContain('Invalid Egyptian phone number')
    expect(mockAdminCreateUser).not.toHaveBeenCalled()
  })

  it('5. Rejects registration on duplicate phone number', async () => {
    const phoneChain = makeChain({
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'existing-vendor-id' }, error: null }),
    })
    mockFrom.mockReturnValueOnce(phoneChain)

    const req = new NextRequest('http://localhost/api/vendor/register', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })

    const res = await registerHandler(req)
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toContain('phone number is already registered')
    expect(mockAdminCreateUser).not.toHaveBeenCalled()
  })

  it('6. Rejects registration on duplicate email in vendors table', async () => {
    const phoneChain = makeChain({ maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) })
    const emailChain = makeChain({
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'existing-vendor-id' }, error: null }),
    })
    mockFrom.mockReturnValueOnce(phoneChain).mockReturnValueOnce(emailChain)

    const req = new NextRequest('http://localhost/api/vendor/register', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })

    const res = await registerHandler(req)
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toContain('email address is already registered')
    expect(mockAdminCreateUser).not.toHaveBeenCalled()
  })

  it('7. Handles Supabase Auth creation failure safely (duplicate auth user)', async () => {
    const phoneChain = makeChain({ maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) })
    const emailChain = makeChain({ maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) })
    mockFrom.mockReturnValueOnce(phoneChain).mockReturnValueOnce(emailChain)

    mockAdminCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    })

    const req = new NextRequest('http://localhost/api/vendor/register', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })

    const res = await registerHandler(req)
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toContain('already exists')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('8. Cleans up auth user (compensation) if RPC database insert fails', async () => {
    const phoneChain = makeChain({ maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) })
    const emailChain = makeChain({ maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) })
    mockFrom.mockReturnValueOnce(phoneChain).mockReturnValueOnce(emailChain)

    mockAdminCreateUser.mockResolvedValue({
      data: { user: { id: 'auth-user-to-cleanup', email: 'vendor@alamal.com' } },
      error: null,
    })

    mockRpc.mockResolvedValue({ data: null, error: { message: 'Database constraint violation' } })
    mockAdminDeleteUser.mockResolvedValue({ error: null })

    const req = new NextRequest('http://localhost/api/vendor/register', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })

    const res = await registerHandler(req)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toContain('Failed to submit registration')
    // Verify compensation: auth user was cleaned up to avoid orphaned accounts
    expect(mockAdminDeleteUser).toHaveBeenCalledWith('auth-user-to-cleanup')
  })
})

describe('P0-01-B: Vendor Login (/api/vendor/login)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('9. Logs in successfully with email and password', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: 'auth-user-uuid-123', email: 'vendor@alamal.com' } },
      error: null,
    })

    const vendorChain = makeChain({
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: 'vendor-123',
          display_name: 'شركة الأمل',
          system_status: 'Active',
          whatsapp_number: '01012345678',
        },
        error: null,
      }),
    })
    mockFrom.mockReturnValueOnce(vendorChain)

    const req = new NextRequest('http://localhost/api/vendor/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'vendor@alamal.com',
        password: 'SecurePassword123!',
      }),
    })

    const res = await loginHandler(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.redirectUrl).toBe('/vendor/auctions')
    expect(body.vendor.id).toBe('vendor-123')
    expect(body.vendor.displayName).toBe('شركة الأمل')

    // Verify native Supabase Auth was called with trimmed lowercase email
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'vendor@alamal.com',
      password: 'SecurePassword123!',
    })

    // Verify NO OTP was used
    expect(mockVerifyOtp).not.toHaveBeenCalled()
    expect(mockSendOtp).not.toHaveBeenCalled()

    // Verify NO listUsers() was called
    expect(mockAdminListUsers).not.toHaveBeenCalled()

    // Password must NEVER be returned in response
    expect(JSON.stringify(body)).not.toContain('SecurePassword123!')
  })

  it('10. Returns 401 on invalid email or password', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    })

    const req = new NextRequest('http://localhost/api/vendor/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'vendor@alamal.com',
        password: 'WrongPassword',
      }),
    })

    const res = await loginHandler(req)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toContain('Invalid email or password')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('11. Returns 403 when vendor is suspended and signs out', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: 'auth-user-suspended', email: 'suspended@vendor.com' } },
      error: null,
    })

    const vendorChain = makeChain({
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: 'vendor-suspended',
          display_name: 'شركة معلقة',
          system_status: 'Suspended',
          whatsapp_number: '01011112222',
        },
        error: null,
      }),
    })
    mockFrom.mockReturnValueOnce(vendorChain)

    const req = new NextRequest('http://localhost/api/vendor/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'suspended@vendor.com',
        password: 'Password123!',
      }),
    })

    const res = await loginHandler(req)
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toContain('suspended')
    // Must force sign out
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('12. Returns 403 when authenticated user has no linked vendor profile', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: 'customer-not-vendor', email: 'customer@example.com' } },
      error: null,
    })

    const vendorChain = makeChain({
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })
    mockFrom.mockReturnValueOnce(vendorChain)

    const req = new NextRequest('http://localhost/api/vendor/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'customer@example.com',
        password: 'Password123!',
      }),
    })

    const res = await loginHandler(req)
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toContain('No vendor profile associated')
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('13. Rejects login when email or password is missing in request body', async () => {
    const req = new NextRequest('http://localhost/api/vendor/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'vendor@alamal.com' }), // missing password
    })

    const res = await loginHandler(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toContain('Email and password are required')
    expect(mockSignInWithPassword).not.toHaveBeenCalled()
  })
})

describe('P0-01-B: Proxy Public Auth Boundary', () => {
  it('1. /api/vendor/login is public (does not require auth)', () => {
    expect(requiresAuth('/api/vendor/login', 'POST')).toBe(false)
    expect(requiresAuth('/en/api/vendor/login', 'POST')).toBe(false)
    expect(requiresAuth('/ar/api/vendor/login', 'POST')).toBe(false)
  })

  it('2. /api/vendor/register is public (does not require auth)', () => {
    expect(requiresAuth('/api/vendor/register', 'POST')).toBe(false)
    expect(requiresAuth('/en/api/vendor/register', 'POST')).toBe(false)
    expect(requiresAuth('/ar/api/vendor/register', 'POST')).toBe(false)
  })

  it('3. /api/vendors/[id]/... remains protected (requires auth)', () => {
    expect(requiresAuth('/api/vendors/v-123', 'GET')).toBe(true)
    expect(requiresAuth('/api/vendors/v-123/message', 'POST')).toBe(true)
    expect(requiresAuth('/api/vendors/v-123/suspend', 'POST')).toBe(true)
    expect(requiresAuth('/api/vendors/v-123/activate', 'POST')).toBe(true)
  })

  it('4. unrelated /api/vendor/... remains protected (requires auth)', () => {
    expect(requiresAuth('/api/vendor/auctions', 'GET')).toBe(true)
    expect(requiresAuth('/api/vendor/profile', 'GET')).toBe(true)
    expect(requiresAuth('/api/vendor/settings', 'POST')).toBe(true)
  })

  it('5. no broad vendor prefix exemption exists', () => {
    expect(requiresAuth('/api/vendor/login/extra', 'POST')).toBe(true)
    expect(requiresAuth('/api/vendor/register/extra', 'POST')).toBe(true)
    expect(requiresAuth('/api/vendor/unknown', 'POST')).toBe(true)
    expect(requiresAuth('/api/vendors/search', 'GET')).toBe(true)
  })
})
