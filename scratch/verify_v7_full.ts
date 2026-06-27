import { createAdminClient } from '../src/lib/dal/customers'
import { executeTransition } from '../src/lib/dal/transitions'
import { getRequestTimeline } from '../src/lib/dal/timeline'

type StaffRow = {
    id: string
    auth_user_id: string | null
    full_name: string | null
    staff_role: string | null
    is_active: boolean | null
    extra_roles?: string[]
}

type RequestRow = {
    id: string
    request_code: string
    current_status: string | null
    reviewer_decision: string | null
    is_archived: boolean | null
    request_kind?: string | null
    operations_entered_at?: string | null
    reporting_entered_at?: string | null
    ready_entered_at?: string | null
}

function line(title = '') {
    console.log('\n' + '='.repeat(70))
    console.log(title)
    console.log('='.repeat(70))
}

async function getAllStaff(db: any): Promise<StaffRow[]> {
    const { data: staff, error: staffErr } = await db
        .from('staff_members')
        .select('id, auth_user_id, full_name, staff_role, is_active')
        .eq('is_active', true)

    if (staffErr) throw new Error(`getAllStaff staff_members failed: ${staffErr.message}`)

    const ids = (staff || []).map((s: any) => s.id)
    const extraRolesMap = new Map<string, string[]>()

    if (ids.length > 0) {
        const { data: roles, error: rolesErr } = await db
            .from('staff_member_roles')
            .select('staff_member_id, role_code')
            .in('staff_member_id', ids)
            .eq('is_active', true)

        if (rolesErr) throw new Error(`getAllStaff staff_member_roles failed: ${rolesErr.message}`)

        for (const r of roles || []) {
            const arr = extraRolesMap.get(r.staff_member_id) || []
            arr.push(r.role_code)
            extraRolesMap.set(r.staff_member_id, arr)
        }
    }

    return (staff || []).map((s: any) => ({
        ...s,
        extra_roles: extraRolesMap.get(s.id) || []
    }))
}

function hasRole(staff: StaffRow | null | undefined, role: string) {
    if (!staff) return false
    return staff.staff_role === role || (staff.extra_roles || []).includes(role)
}

function isAdmin(staff: StaffRow | null | undefined) {
    if (!staff) return false
    return staff.staff_role === 'admin' || staff.staff_role === 'owner'
}

function pickActor(all: StaffRow[], role: string, adminFallback: StaffRow) {
    return all.find((s) => hasRole(s, role)) || adminFallback
}

async function getOneValidPreferenceRow(db: any) {
    const { data, error } = await db
        .from('request_preferences')
        .select('urgency_level, search_scope')
        .not('urgency_level', 'is', null)
        .not('search_scope', 'is', null)
        .limit(20)

    if (error) throw new Error(`getOneValidPreferenceRow failed: ${error.message}`)

    if (data && data.length > 0) return data[0]

    return {
        urgency_level: 'normal',
        search_scope: 'online_only'
    }
}

async function findTestRequest(db: any): Promise<RequestRow> {
    const { data: requests, error } = await db
        .from('requests')
        .select('id, request_code, current_status, reviewer_decision, is_archived, request_kind')
        .eq('is_archived', false)
        .neq('current_status', 'closed')
        .order('created_at', { ascending: false })
        .limit(50)

    if (error) throw new Error(`findTestRequest failed: ${error.message}`)
    if (!requests || requests.length === 0) throw new Error('No usable request found for testing.')

    const ids = requests.map((r: any) => r.id)

    const { data: uiRows, error: uiErr } = await db
        .from('v_request_ui_status')
        .select('request_id, client_released_at')
        .in('request_id', ids)

    if (uiErr) throw new Error(`findTestRequest ui status failed: ${uiErr.message}`)

    const releasedMap = new Map((uiRows || []).map((r: any) => [r.request_id, r.client_released_at]))

    const picked =
        requests.find((r: any) => !releasedMap.get(r.id) && !r.is_archived) ||
        requests[0]

    return picked
}

async function ensurePreferences(
    db: any,
    requestId: string,
    overrides?: Partial<{ urgency_level: string; search_scope: string }>
) {
    const sample = await getOneValidPreferenceRow(db)

    const payload = {
        request_id: requestId,
        urgency_level: overrides?.urgency_level || sample.urgency_level,
        search_scope: overrides?.search_scope || sample.search_scope
    }

    const { error } = await db
        .from('request_preferences')
        .upsert(payload, { onConflict: 'request_id' })

    if (error) throw new Error(`ensurePreferences failed: ${error.message}`)
}

async function cleanupRequestArtifacts(db: any, requestId: string) {
    const cleanupTargets = [
        'request_candidate_shortlists',
        'merchant_quotes'
    ]

    for (const table of cleanupTargets) {
        const { error } = await db.from(table).delete().eq('request_id', requestId)
        if (error) {
            console.log(`Cleanup warning on ${table}: ${error.message}`)
        }
    }
}

async function resetRequestToIntake(db: any, requestId: string) {
    const { error } = await db
        .from('requests')
        .update({
            current_status: 'submitted',
            reviewer_decision: null,
            is_archived: false,
            request_kind: 'everyday_purchase',
            operations_entered_at: null,
            reporting_entered_at: null,
            ready_entered_at: null
        })
        .eq('id', requestId)

    if (error) throw new Error(`resetRequestToIntake failed: ${error.message}`)

    await ensurePreferences(db, requestId, { search_scope: 'online_only' })
    await cleanupRequestArtifacts(db, requestId)
}

async function getRequest(db: any, requestId: string): Promise<RequestRow> {
    const { data, error } = await db
        .from('requests')
        .select(`
      id,
      request_code,
      current_status,
      reviewer_decision,
      is_archived,
      request_kind,
      operations_entered_at,
      reporting_entered_at,
      ready_entered_at
    `)
        .eq('id', requestId)
        .single()

    if (error) throw new Error(`getRequest failed: ${error.message}`)
    return data
}

async function getShortlistTemplate(db: any) {
    const { data, error } = await db
        .from('request_candidate_shortlists')
        .select('*')
        .limit(1)
        .single()

    if (error || !data) {
        throw new Error('No shortlist template row found in request_candidate_shortlists.')
    }

    return data
}

async function getMerchantQuoteTemplate(db: any) {
    const { data, error } = await db
        .from('merchant_quotes')
        .select('*')
        .limit(1)
        .single()

    if (error || !data) {
        throw new Error('No merchant quote template row found in merchant_quotes.')
    }

    return data
}

async function getNextRankingPosition(db: any, requestId: string) {
    const { data, error } = await db
        .from('request_candidate_shortlists')
        .select('ranking_position')
        .eq('request_id', requestId)
        .order('ranking_position', { ascending: false })
        .limit(1)

    if (error) throw new Error(`getNextRankingPosition failed: ${error.message}`)

    const maxPos = data?.[0]?.ranking_position || 0
    return maxPos + 1
}

async function addShortlistRowByClone(
    db: any,
    requestId: string,
    actorUserId?: string | null
) {
    const template = await getShortlistTemplate(db)
    const nextPos = await getNextRankingPosition(db, requestId)

    const payload: any = { ...template }

    delete payload.id
    delete payload.created_at
    delete payload.updated_at

    payload.request_id = requestId
    payload.ranking_position = nextPos
    payload.selected_by_user_id = actorUserId ?? payload.selected_by_user_id ?? null
    payload.option_label = `Verify Option ${Date.now()}`
    payload.reason_summary = 'Verification shortlist row'
    payload.customer_summary = 'Verification customer summary'
    payload.is_active = true
    payload.is_recommended = true

    const { data, error } = await db
        .from('request_candidate_shortlists')
        .insert(payload)
        .select()
        .single()

    if (error) throw new Error(`addShortlistRowByClone failed: ${error.message}`)
    return data
}

async function addOfflineQuoteByClone(
    db: any,
    requestId: string,
    staffId: string
) {
    const template = await getMerchantQuoteTemplate(db)

    const payload: any = { ...template }

    delete payload.id
    delete payload.created_at
    delete payload.updated_at

    payload.request_id = requestId
    payload.captured_by_staff_id = staffId
    payload.is_active = true

    if ('merchant_name' in payload) payload.merchant_name = `Verify Merchant ${Date.now()}`
    if ('product_title' in payload) payload.product_title = `Verify Product ${Date.now()}`
    if ('notes' in payload) payload.notes = 'Verification merchant quote'

    const { data, error } = await db
        .from('merchant_quotes')
        .insert(payload)
        .select()
        .single()

    if (error) throw new Error(`addOfflineQuoteByClone failed: ${error.message}`)
    return data
}

async function printTimeline(db: any, requestId: string) {
    line('TIMELINE CHECK')

    const timeline = await getRequestTimeline(requestId)
    console.log(`Timeline events count: ${timeline.length}`)

    timeline.forEach((e, i) => {
        console.log(
            `[${i}] ${e.event_at} | ${e.transition_name} | ${e.from_canonical_state} -> ${e.to_canonical_state}`
        )
    })

    line('RECENT TRANSITION HISTORY')

    const { data: recent, error } = await db
        .from('request_status_history')
        .select('created_at, transition_name, from_canonical_state, to_canonical_state, changed_by_staff_id, change_reason')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false })
        .limit(20)

    if (error) throw new Error(`printTimeline history failed: ${error.message}`)

    console.log(JSON.stringify(recent || [], null, 2))
}

async function expectFailure(fn: () => Promise<any>, label: string) {
    try {
        await fn()
        throw new Error(`${label} was expected to fail but succeeded`)
    } catch (err: any) {
        console.log(`PASS: ${label} blocked as expected -> ${err.message}`)
    }
}

async function verify() {
    const db = await createAdminClient()

    line('BATCH 2A FULL VERIFY')

    const request = await findTestRequest(db)
    const allStaff = await getAllStaff(db)

    const admin = allStaff.find((s) => isAdmin(s))
    if (!admin) throw new Error('No admin staff found.')

    const reviewer = pickActor(allStaff, 'reviewer', admin)
    const researcher = pickActor(allStaff, 'researcher', admin)
    const reporter = pickActor(allStaff, 'reporter', admin)
    const fieldAgent = pickActor(allStaff, 'field_agent', admin)

    console.log('Request:', request)
    console.log('Actors:', {
        admin: admin.full_name,
        reviewer: reviewer.full_name,
        researcher: researcher.full_name,
        reporter: reporter.full_name,
        field_agent: fieldAgent.full_name
    })

    // ---------------------------------------------------------------------------
    // BLOCK 1
    // ---------------------------------------------------------------------------
    await resetRequestToIntake(db, request.id)

    line('BLOCK 1 — INTAKE / ISSUES')

    console.log('Testing CLARIFY_INTAKE...')
    const clarify = await executeTransition(
        'CLARIFY_INTAKE',
        request.id,
        reviewer.id,
        'Test clarification from verify_v7_full'
    )
    console.log('Result:', JSON.stringify(clarify))

    console.log('\nTesting RESOLVE_ISSUE...')
    const resolve = await executeTransition(
        'RESOLVE_ISSUE',
        request.id,
        reviewer.id,
        'Test resolve from verify_v7_full'
    )
    console.log('Result:', JSON.stringify(resolve))

    console.log('\nTesting invalid transition: REVERT_TO_OPS on INTAKE...')
    await expectFailure(
        () => executeTransition('REVERT_TO_OPS', request.id, admin.id, 'Should fail on intake'),
        'REVERT_TO_OPS on INTAKE'
    )

    // ---------------------------------------------------------------------------
    // BLOCK 2
    // ---------------------------------------------------------------------------
    await resetRequestToIntake(db, request.id)
    await ensurePreferences(db, request.id, { search_scope: 'online_only' })

    line('BLOCK 2 — ONLINE OPERATIONS')

    console.log('Testing APPROVE_INTAKE...')
    const approve = await executeTransition(
        'APPROVE_INTAKE',
        request.id,
        reviewer.id,
        'Approve from verify_v7_full'
    )
    console.log('Result:', JSON.stringify(approve))
    console.log('After APPROVE:', await getRequest(db, request.id))

    console.log('\nTesting START_RESEARCH...')
    const startResearch = await executeTransition(
        'START_RESEARCH',
        request.id,
        researcher.id,
        'Start research from verify_v7_full'
    )
    console.log('Result:', JSON.stringify(startResearch))

    console.log('\nTesting MOVE_TO_REPORTING...')
    const moveToReporting = await executeTransition(
        'MOVE_TO_REPORTING',
        request.id,
        researcher.id,
        'Move to reporting from verify_v7_full'
    )
    console.log('Result:', JSON.stringify(moveToReporting))
    console.log('After REPORTING:', await getRequest(db, request.id))

    console.log('\nAdding shortlist...')
    await addShortlistRowByClone(db, request.id, reporter.auth_user_id)

    console.log('\nTesting SIGNAL_READY...')
    const ready = await executeTransition(
        'SIGNAL_READY',
        request.id,
        reporter.id,
        'Signal ready from verify_v7_full'
    )
    console.log('Result:', JSON.stringify(ready))
    console.log('After READY:', await getRequest(db, request.id))

    console.log('\nTesting REVERT_TO_OPS...')
    const revert = await executeTransition(
        'REVERT_TO_OPS',
        request.id,
        reporter.id,
        'Revert to ops from verify_v7_full'
    )
    console.log('Result:', JSON.stringify(revert))
    console.log('After REVERT:', await getRequest(db, request.id))

    // ---------------------------------------------------------------------------
    // BLOCK 3
    // ---------------------------------------------------------------------------
    await resetRequestToIntake(db, request.id)
    await ensurePreferences(db, request.id, { search_scope: 'offline_only' })

    line('BLOCK 3 — OFFLINE FLOW')

    console.log('Testing APPROVE_INTAKE...')
    await executeTransition(
        'APPROVE_INTAKE',
        request.id,
        reviewer.id,
        'Offline approve from verify_v7_full'
    )

    console.log('\nTesting START_FIELD_WORK...')
    const startField = await executeTransition(
        'START_FIELD_WORK',
        request.id,
        fieldAgent.id,
        'Start field work from verify_v7_full'
    )
    console.log('Result:', JSON.stringify(startField))

    console.log('\nTesting MOVE_TO_REPORTING...')
    const fieldToReporting = await executeTransition(
        'MOVE_TO_REPORTING',
        request.id,
        fieldAgent.id,
        'Field move to reporting from verify_v7_full'
    )
    console.log('Result:', JSON.stringify(fieldToReporting))
    console.log('After REPORTING:', await getRequest(db, request.id))

    console.log('\nAdding shortlist...')
    await addShortlistRowByClone(db, request.id, reporter.auth_user_id)

    console.log('\nTesting SIGNAL_READY without quote (should fail)...')
    await expectFailure(
        () => executeTransition('SIGNAL_READY', request.id, reporter.id, 'Should fail missing quote'),
        'SIGNAL_READY without offline quote'
    )

    console.log('\nAdding offline quote...')
    await addOfflineQuoteByClone(db, request.id, fieldAgent.id)

    console.log('\nTesting SIGNAL_READY with quote...')
    const offlineReady = await executeTransition(
        'SIGNAL_READY',
        request.id,
        reporter.id,
        'Offline ready from verify_v7_full'
    )
    console.log('Result:', JSON.stringify(offlineReady))
    console.log('After READY:', await getRequest(db, request.id))

    await printTimeline(db, request.id)

    line('FINAL REQUEST STATE')
    console.log(await getRequest(db, request.id))
}

verify().catch((err) => {
    console.error('\nVERIFY FAILED:', err.message)
    process.exit(1)
})