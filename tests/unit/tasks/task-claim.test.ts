/**
 * P1-05 — Atomic Task Claiming Unit Tests
 *
 * Verifies:
 * 1. Successful claim: authenticated + approved contributor + valid task -> calls fn_claim_platform_task RPC -> returns HTTP 200.
 * 2. Unauthenticated caller: no session user -> returns HTTP 401 -> RPC is NOT called.
 * 3. Missing taskId: request body missing taskId -> returns HTTP 400 -> RPC is NOT called.
 * 4. Contributor identity mismatch: RPC returns CONTRIBUTOR_IDENTITY_MISMATCH -> returns HTTP 403.
 * 5. Unapproved contributor: contributor status is not approved -> returns HTTP 403 -> RPC is NOT called.
 * 6. Task not found: RPC returns TASK_NOT_FOUND -> returns HTTP 404.
 * 7. Task unavailable / already claimed: RPC returns TASK_NOT_AVAILABLE -> returns HTTP 409.
 * 8. Contributor already has active task: RPC returns ALREADY_HAVE_ACTIVE_TASK -> returns HTTP 400.
 * 9. Stale claim recovery: RPC atomically expires stale claim and returns new claim -> returns HTTP 200.
 * 10. No manual rollback: verify no client-side update/rollback to platform_tasks is executed on failure.
 * 11. Unexpected RPC error: RPC returns unexpected error -> returns HTTP 500.
 */

import { POST } from '@/app/api/contributors/tasks/claim/route'

const mockGetUser = jest.fn()
const mockRpc = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
    rpc: mockRpc,
  })),
}))

describe('P1-05 — POST /api/contributors/tasks/claim', () => {
  const mockUserId = 'user-1111-uuid'
  const mockContributorId = 'contrib-2222-uuid'
  const mockTaskId = 'task-3333-uuid'
  const mockClaimId = 'claim-4444-uuid'

  beforeEach(() => {
    jest.clearAllMocks()

    // Default: Authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    })

    // Default: Approved contributor profile lookup
    mockFrom.mockImplementation((table: string) => {
      if (table === 'contributors') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: mockContributorId, status: 'approved' },
            error: null,
          }),
        }
      }
      return {
        select: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
    })

    // Default: RPC succeeds
    mockRpc.mockResolvedValue({
      data: {
        success: true,
        claim: {
          id: mockClaimId,
          task_id: mockTaskId,
          contributor_id: mockContributorId,
          status: 'in_progress',
          claimed_at: '2026-09-18T00:00:00.000Z',
          expires_at: '2026-09-18T01:00:00.000Z',
        },
      },
      error: null,
    })
  })

  it('1. Successful claim: calls atomic RPC and returns HTTP 200 with claim', async () => {
    const req = new Request('http://localhost/api/contributors/tasks/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: mockTaskId }),
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.claim.id).toBe(mockClaimId)
    expect(json.claim.task_id).toBe(mockTaskId)

    expect(mockRpc).toHaveBeenCalledWith('fn_claim_platform_task', {
      p_task_id: mockTaskId,
      p_contributor_id: mockContributorId,
    })
  })

  it('2. Unauthenticated caller: returns HTTP 401 and does not call RPC', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })

    const req = new Request('http://localhost/api/contributors/tasks/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: mockTaskId }),
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('3. Missing taskId: returns HTTP 400 and does not call RPC', async () => {
    const req = new Request('http://localhost/api/contributors/tasks/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Missing taskId')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('4. Contributor identity mismatch: RPC returns mismatch error -> returns HTTP 403', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        success: false,
        code: 'CONTRIBUTOR_IDENTITY_MISMATCH',
        error: 'Authenticated user does not own this contributor profile',
      },
      error: null,
    })

    const req = new Request('http://localhost/api/contributors/tasks/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: mockTaskId }),
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.code).toBe('CONTRIBUTOR_IDENTITY_MISMATCH')
  })

  it('5. Unapproved contributor: returns HTTP 403 before RPC invocation', async () => {
    mockFrom.mockImplementationOnce((table: string) => {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: mockContributorId, status: 'pending' },
          error: null,
        }),
      }
    })

    const req = new Request('http://localhost/api/contributors/tasks/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: mockTaskId }),
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error).toBe('Contributor not approved')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('6. Task not found: RPC returns TASK_NOT_FOUND -> returns HTTP 404', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        success: false,
        code: 'TASK_NOT_FOUND',
        error: 'Task not found',
      },
      error: null,
    })

    const req = new Request('http://localhost/api/contributors/tasks/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: mockTaskId }),
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.code).toBe('TASK_NOT_FOUND')
  })

  it('7. Task already claimed / unavailable: RPC returns TASK_NOT_AVAILABLE -> returns HTTP 409', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        success: false,
        code: 'TASK_NOT_AVAILABLE',
        error: 'Task is no longer available',
      },
      error: null,
    })

    const req = new Request('http://localhost/api/contributors/tasks/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: mockTaskId }),
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.code).toBe('TASK_NOT_AVAILABLE')
  })

  it('8. Contributor already has active task: RPC returns ALREADY_HAVE_ACTIVE_TASK -> returns HTTP 400', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        success: false,
        code: 'ALREADY_HAVE_ACTIVE_TASK',
        error: 'You already have an active task in progress',
      },
      error: null,
    })

    const req = new Request('http://localhost/api/contributors/tasks/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: mockTaskId }),
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.code).toBe('ALREADY_HAVE_ACTIVE_TASK')
  })

  it('9. Stale claim recovery: RPC successfully expires stale claim and returns new claim -> returns HTTP 200', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        success: true,
        claim: {
          id: 'new-claim-after-stale-expiry',
          task_id: mockTaskId,
          contributor_id: mockContributorId,
          status: 'in_progress',
          claimed_at: '2026-09-18T00:05:00.000Z',
          expires_at: '2026-09-18T01:05:00.000Z',
        },
      },
      error: null,
    })

    const req = new Request('http://localhost/api/contributors/tasks/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: mockTaskId }),
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.claim.id).toBe('new-claim-after-stale-expiry')
  })

  it('10. No manual rollback: failed RPC does not trigger any client-side update/rollback to platform_tasks', async () => {
    const mockPlatformTasksUpdate = jest.fn()

    mockFrom.mockImplementation((table: string) => {
      if (table === 'contributors') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: mockContributorId, status: 'approved' },
            error: null,
          }),
        }
      }
      if (table === 'platform_tasks') {
        return {
          update: mockPlatformTasksUpdate,
        }
      }
      return {
        select: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
      }
    })

    mockRpc.mockResolvedValueOnce({
      data: {
        success: false,
        code: 'TASK_NOT_AVAILABLE',
        error: 'Task is no longer available',
      },
      error: null,
    })

    const req = new Request('http://localhost/api/contributors/tasks/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: mockTaskId }),
    })

    const res = await POST(req)
    expect(res.status).toBe(409)

    // Verify zero client-side mutations or manual rollbacks were executed
    expect(mockPlatformTasksUpdate).not.toHaveBeenCalled()
  })

  it('11. Unexpected RPC error: returns HTTP 500', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database connection failure' },
    })

    const req = new Request('http://localhost/api/contributors/tasks/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: mockTaskId }),
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toBe('Failed to claim task')
  })
})
