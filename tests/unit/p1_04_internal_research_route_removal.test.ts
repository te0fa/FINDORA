import fs from 'fs'
import path from 'path'

describe('P1-04: Internal Research Job Route Removal & Security Lockdown', () => {
  const rootDir = process.cwd()

  describe('1. Obsolete HTTP Endpoint Removal', () => {
    it('proves the obsolete route file src/app/api/internal/jobs/research/run/route.ts is deleted', () => {
      const routeFilePath = path.join(rootDir, 'src/app/api/internal/jobs/research/run/route.ts')
      expect(fs.existsSync(routeFilePath)).toBe(false)
    })

    it('proves the obsolete route directory is removed or contains no route handlers', () => {
      const routeDirPath = path.join(rootDir, 'src/app/api/internal/jobs/research/run')
      expect(fs.existsSync(routeDirPath)).toBe(false)
    })
  })

  describe('2. Proxy Exemption Removal', () => {
    it('proves the public exemption for /api/internal/jobs/research/run is absent from src/proxy.ts', () => {
      const proxyPath = path.join(rootDir, 'src/proxy.ts')
      expect(fs.existsSync(proxyPath)).toBe(true)

      const proxyContent = fs.readFileSync(proxyPath, 'utf8')
      expect(proxyContent).not.toContain('/api/internal/jobs/research/run')
      expect(proxyContent).not.toContain("cleanPath.startsWith('/api/internal/jobs/research/run')")
    })
  })

  describe('3. Preservation of Legitimate Staff Research Path', () => {
    const actionsPath = path.join(
      rootDir,
      'src/app/[locale]/staff/workspace/[request_id]/research-actions.ts'
    )

    it('verifies src/app/[locale]/staff/workspace/[request_id]/research-actions.ts exists', () => {
      expect(fs.existsSync(actionsPath)).toBe(true)
    })

    it('confirms handleManualResearchTrigger is exported as a Server Action', () => {
      const content = fs.readFileSync(actionsPath, 'utf8')
      expect(content).toContain("'use server'")
      expect(content).toContain('export async function handleManualResearchTrigger')
    })

    it('confirms strict staff authentication and permission checks in research-actions.ts', () => {
      const content = fs.readFileSync(actionsPath, 'utf8')
      expect(content).toContain('supabase.auth.getUser()')
      expect(content).toContain('getStaffMemberByAuthUserId(user.id)')
      expect(content).toContain('!staffMember || !staffMember.is_active')
      expect(content).toContain('getStaffUiPermissions(staffMember)')
      expect(content).toContain('!permissions.canTriggerResearch')
    })

    it('confirms active claimed job requirement before calling executeOnlineResearch', () => {
      const content = fs.readFileSync(actionsPath, 'utf8')
      expect(content).toContain(".eq('job_type', 'online_research')")
      expect(content).toContain(".eq('status', 'claimed')")
      expect(content).toContain('executeOnlineResearch(job.id, requestId)')
    })

    it('confirms operational audit logging on research trigger', () => {
      const content = fs.readFileSync(actionsPath, 'utf8')
      expect(content).toContain("eventName: 'MANUAL_RESEARCH_TRIGGERED'")
    })
  })

  describe('4. Preservation of Research Agent Core', () => {
    const agentPath = path.join(rootDir, 'src/lib/agents/research/run-online-research.ts')

    it('confirms executeOnlineResearch remains intact in src/lib/agents/research/run-online-research.ts', () => {
      expect(fs.existsSync(agentPath)).toBe(true)
      const content = fs.readFileSync(agentPath, 'utf8')
      expect(content).toContain('export async function executeOnlineResearch(jobId: string, requestId: string)')
      expect(content).toContain('runGroundedResearch(prompt)')
      expect(content).toContain('createResearchRun(')
      expect(content).toContain('createResearchItems(')
      expect(content).toContain('completeJob(jobId')
    })

    it('confirms workflow dispatcher still integrates executeOnlineResearch', () => {
      const workflowPath = path.join(rootDir, 'src/lib/workflow/agents.ts')
      expect(fs.existsSync(workflowPath)).toBe(true)
      const content = fs.readFileSync(workflowPath, 'utf8')
      expect(content).toContain("import { executeOnlineResearch } from '@/lib/agents/research/run-online-research'")
      expect(content).toContain('executeOnlineResearch(onlineJobId, request.id)')
    })
  })
})
