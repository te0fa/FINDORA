/**
 * Unit Tests for P2-08: Cron Fraud Detection Remediation
 * Verifies removal of mock Geo-Mismatch detection logic and validates
 * remaining fraud-audit sections (auth, stabilizer guard, IP clustering,
 * device sharing, velocity spikes).
 */

import { GET } from '@/app/api/cron/fraud-audit/route'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAIFeatureStatus } from '@/lib/dal/ai-control'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/dal/ai-control', () => ({
  getAIFeatureStatus: jest.fn(),
}))

describe('P2-08 — Cron Fraud Detection Route & Mock Removal', () => {
  const OLD_ENV = process.env
  const testCronSecret = 'test_cron_secret_p2_08'

  let mockDb: any
  let mockFrom: jest.Mock
  let mockSelect: jest.Mock
  let mockNot: jest.Mock
  let mockEq: jest.Mock
  let mockGte: jest.Mock
  let mockInsert: jest.Mock
  let mockUpsert: jest.Mock
  let mockLimit: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...OLD_ENV, CRON_SECRET: testCronSecret }

    mockInsert = jest.fn().mockResolvedValue({ data: null, error: null })
    mockUpsert = jest.fn().mockResolvedValue({ data: null, error: null })
    mockLimit = jest.fn().mockResolvedValue({ data: [], error: null })

    mockGte = jest.fn().mockResolvedValue({ data: [], error: null })

    mockEq = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          limit: mockLimit,
        }),
        limit: mockLimit,
      }),
      gte: mockGte,
      limit: mockLimit,
    })

    mockNot = jest.fn().mockResolvedValue({ data: [], error: null })

    mockSelect = jest.fn().mockReturnValue({
      not: mockNot,
      eq: mockEq,
      gte: mockGte,
      limit: mockLimit,
    })

    mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      upsert: mockUpsert,
    })

    mockDb = {
      from: mockFrom,
    }
    ;(createAdminClient as jest.Mock).mockReturnValue(mockDb)
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  test('1. Fails closed with 401 when Authorization header is missing', async () => {
    const req = new Request('https://findora.test/api/cron/fraud-audit', {
      method: 'GET',
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  test('2. Fails closed with 401 when Bearer token is invalid', async () => {
    const req = new Request('https://findora.test/api/cron/fraud-audit', {
      method: 'GET',
      headers: { authorization: 'Bearer wrong-secret' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  test('3. Halts gracefully when economy stabilizer flag is disabled', async () => {
    ;(getAIFeatureStatus as jest.Mock).mockResolvedValue({
      enabled: false,
      status: 'disabled',
    })

    const req = new Request('https://findora.test/api/cron/fraud-audit', {
      method: 'GET',
      headers: { authorization: `Bearer ${testCronSecret}` },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.message).toBe('Stabilizer is currently disabled')
  })

  test('4. Executes successfully when authorized and stabilizer is enabled', async () => {
    ;(getAIFeatureStatus as jest.Mock).mockResolvedValue({
      enabled: true,
      status: 'enabled',
    })

    const req = new Request('https://findora.test/api/cron/fraud-audit', {
      method: 'GET',
      headers: { authorization: `Bearer ${testCronSecret}` },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.message).toBe('Fraud audit completed.')
    expect(body.alertsGenerated).toBe(0)
  })

  test('5. VERIFIES P2-08: offline_sourcing_tasks is never queried and no geo_mismatch alert is generated', async () => {
    ;(getAIFeatureStatus as jest.Mock).mockResolvedValue({
      enabled: true,
      status: 'enabled',
    })

    const req = new Request('https://findora.test/api/cron/fraud-audit', {
      method: 'GET',
      headers: { authorization: `Bearer ${testCronSecret}` },
    })
    await GET(req)

    // Verify all tables accessed
    const queriedTables = mockFrom.mock.calls.map((call: any[]) => call[0])
    expect(queriedTables).not.toContain('offline_sourcing_tasks')

    // Verify no insert with alert_type === 'geo_mismatch'
    const insertCalls = mockInsert.mock.calls
    for (const call of insertCalls) {
      expect(call[0]?.alert_type).not.toBe('geo_mismatch')
    }

    // Verify no upsert into contributor_risk_scores with risk_score === 60
    const upsertCalls = mockUpsert.mock.calls
    for (const call of upsertCalls) {
      expect(call[0]?.risk_score).not.toBe(60)
    }
  })

  test('6. Preserves Section 1 (IP Clustering Detection) operational behavior', async () => {
    ;(getAIFeatureStatus as jest.Mock).mockResolvedValue({
      enabled: true,
      status: 'enabled',
    })

    // 3 contributors sharing same IP
    const sharedIp = '10.0.0.1'
    mockNot.mockResolvedValueOnce({
      data: [
        { id: 'user-1', last_ip_address: sharedIp },
        { id: 'user-2', last_ip_address: sharedIp },
        { id: 'user-3', last_ip_address: sharedIp },
      ],
      error: null,
    })

    // No existing alerts
    mockLimit.mockResolvedValue({ data: [], error: null })

    const req = new Request('https://findora.test/api/cron/fraud-audit', {
      method: 'GET',
      headers: { authorization: `Bearer ${testCronSecret}` },
    })
    const res = await GET(req)
    const body = await res.json()

    expect(body.success).toBe(true)
    expect(body.alertsGenerated).toBe(3)

    // Should insert ip_cluster alert and upsert risk_score 80
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        alert_type: 'ip_cluster',
        alert_level: 'critical',
      })
    )
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        risk_score: 80,
      })
    )
  })

  test('7. Preserves Section 4 (Velocity Detection) operational behavior', async () => {
    ;(getAIFeatureStatus as jest.Mock).mockResolvedValue({
      enabled: true,
      status: 'enabled',
    })

    // Section 1 empty
    mockNot.mockResolvedValueOnce({ data: [], error: null })
    // Section 2 empty
    mockNot.mockResolvedValueOnce({ data: [], error: null })
    // Section 4 velocity spikes > 500 EGP
    mockGte.mockResolvedValueOnce({
      data: [
        { contributor_id: 'user-high-earner', amount_egp: 300 },
        { contributor_id: 'user-high-earner', amount_egp: 250 },
      ],
      error: null,
    })

    mockLimit.mockResolvedValue({ data: [], error: null })

    const req = new Request('https://findora.test/api/cron/fraud-audit', {
      method: 'GET',
      headers: { authorization: `Bearer ${testCronSecret}` },
    })
    const res = await GET(req)
    const body = await res.json()

    expect(body.success).toBe(true)
    expect(body.alertsGenerated).toBe(1)

    // Should insert velocity_spike alert and upsert risk_score 50
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        contributor_id: 'user-high-earner',
        alert_type: 'velocity_spike',
        alert_level: 'warning',
      })
    )
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        contributor_id: 'user-high-earner',
        risk_score: 50,
      })
    )
  })
})
