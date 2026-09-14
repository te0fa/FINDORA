/**
 * Focused Unit Tests for FINDORA Cron Authentication & Route Behavior (P0-05 Batch 2A)
 */

import { verifyCronAuth, unauthorizedCronResponse } from '@/lib/security/cron'
import { GET as recalculateNetworksGET, POST as recalculateNetworksPOST } from '@/app/api/cron/recalculate-networks/route'

// Mock dependencies of recalculate-networks route
jest.mock('@/lib/dal/ai-control', () => ({
  getAIFeatureStatus: jest.fn().mockResolvedValue({ enabled: true })
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ data: [], error: null })
        })
      })
    })
  })
}))

jest.mock('@/lib/contributors/stabilizer', () => ({
  runEconomyStabilizer: jest.fn().mockResolvedValue({
    status: 'normal',
    growth_pct: 0,
    multiplier: 1.0,
    action: 'none',
    this_week_egp: 0,
    last_week_egp: 0
  })
}))

jest.mock('@/lib/contributors/gamification', () => ({
  syncChallengeProgress: jest.fn().mockResolvedValue(undefined),
  syncBadges: jest.fn().mockResolvedValue(undefined),
  createDecayAlert: jest.fn().mockResolvedValue(undefined)
}))

describe('P0-05 Batch 2A — Cron Authentication Helper (verifyCronAuth)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  function createMockRequest(authHeader?: string | null): Request {
    const headers = new Headers()
    if (authHeader !== undefined && authHeader !== null) {
      headers.set('authorization', authHeader)
    }
    return new Request('https://findora.test/api/cron/test', {
      method: 'GET',
      headers
    })
  }

  test('1. Fails closed when CRON_SECRET is missing from environment', () => {
    delete process.env.CRON_SECRET
    const req = createMockRequest('Bearer test-token-123')
    const result = verifyCronAuth(req)
    expect(result.authorized).toBe(false)
  })

  test('2. Fails closed when CRON_SECRET is an empty string or whitespace', () => {
    process.env.CRON_SECRET = '   '
    const req = createMockRequest('Bearer test-token-123')
    const result = verifyCronAuth(req)
    expect(result.authorized).toBe(false)
  })

  test('3. Fails closed when Authorization header is missing', () => {
    process.env.CRON_SECRET = 'valid-test-secret-key-32chars!!'
    const req = createMockRequest(null)
    const result = verifyCronAuth(req)
    expect(result.authorized).toBe(false)
  })

  test('4. Fails closed when Authorization scheme is not Bearer', () => {
    process.env.CRON_SECRET = 'valid-test-secret-key-32chars!!'
    const req = createMockRequest('Basic valid-test-secret-key-32chars!!')
    const result = verifyCronAuth(req)
    expect(result.authorized).toBe(false)
  })

  test('5. Fails closed when Bearer token is empty or whitespace', () => {
    process.env.CRON_SECRET = 'valid-test-secret-key-32chars!!'
    const req1 = createMockRequest('Bearer ')
    const req2 = createMockRequest('Bearer    ')
    expect(verifyCronAuth(req1).authorized).toBe(false)
    expect(verifyCronAuth(req2).authorized).toBe(false)
  })

  test('6. Fails closed when Bearer token is incorrect', () => {
    process.env.CRON_SECRET = 'valid-test-secret-key-32chars!!'
    const req = createMockRequest('Bearer wrong-token-value-attempt-000')
    const result = verifyCronAuth(req)
    expect(result.authorized).toBe(false)
  })

  test('7. Fails closed when token length differs (shorter or longer)', () => {
    process.env.CRON_SECRET = 'valid-test-secret-key-32chars!!'
    const reqShorter = createMockRequest('Bearer valid-test')
    const reqLonger = createMockRequest('Bearer valid-test-secret-key-32chars!!-extra-suffix')
    expect(verifyCronAuth(reqShorter).authorized).toBe(false)
    expect(verifyCronAuth(reqLonger).authorized).toBe(false)
  })

  test('8. Authorizes when Bearer token matches CRON_SECRET exactly', () => {
    const testSecret = 'c7a9e144-8d99-4786-90fe-002bb525f0e3'
    process.env.CRON_SECRET = testSecret
    const req = createMockRequest(`Bearer ${testSecret}`)
    const result = verifyCronAuth(req)
    expect(result.authorized).toBe(true)
  })

  test('9. unauthorizedCronResponse returns 401 and never leaks secret', async () => {
    const res = unauthorizedCronResponse()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ error: 'Unauthorized' })
    expect(JSON.stringify(body)).not.toContain('CRON_SECRET')
  })
})

describe('P0-05 Batch 2A — recalculate-networks Route Behavior', () => {
  const testSecret = 'sec_recalculate_cron_test_key_999'

  beforeEach(() => {
    process.env.CRON_SECRET = testSecret
  })

  test('1. GET without valid auth returns 401 Unauthorized', async () => {
    const req = new Request('https://findora.test/api/cron/recalculate-networks', {
      method: 'GET',
      headers: new Headers({ 'Authorization': 'Bearer wrong-secret' })
    })
    const res = await recalculateNetworksGET(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  test('2. POST without valid auth returns 401 Unauthorized', async () => {
    const req = new Request('https://findora.test/api/cron/recalculate-networks', {
      method: 'POST',
      headers: new Headers()
    })
    const res = await recalculateNetworksPOST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  test('3. GET with valid auth executes successfully (Vercel Cron compatibility)', async () => {
    const req = new Request('https://findora.test/api/cron/recalculate-networks', {
      method: 'GET',
      headers: new Headers({ 'Authorization': `Bearer ${testSecret}` })
    })
    const res = await recalculateNetworksGET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.stabilizer).toBeDefined()
  })

  test('4. POST with valid auth preserves operational behavior', async () => {
    const req = new Request('https://findora.test/api/cron/recalculate-networks', {
      method: 'POST',
      headers: new Headers({ 'Authorization': `Bearer ${testSecret}` })
    })
    const res = await recalculateNetworksPOST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.stabilizer).toBeDefined()
  })
})
