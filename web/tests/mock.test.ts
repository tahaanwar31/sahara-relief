import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { setTransport, setToken, request } from '../src/api/client'
import { mockTransport, setMockDelay, resetMock, tamperAudit } from '../src/api/mock'
import { api, normaliseVerify } from '../src/api'

async function loginAs(email: string, secret: string) {
  const r = await api.login(email, secret)
  setToken(r.access_token)
  return r.user
}
const CARD_KEYS = ['decision_id', 'case_id', 'created_at', 'actor_type', 'zone', 'result', 'reason_code', 'confidence', 'rule_version', 'checks', 'explain_citizen', 'trace', 'next_step']

describe('mock API follows the contract', () => {
  beforeAll(() => { setMockDelay(0); setTransport(mockTransport) })
  beforeEach(() => { resetMock(); setToken(null) })

  it('login returns the contract shape; a bad login is a 401 in the error format', async () => {
    const u = await loginAs('zainab@citizens.sahara.test', '246810')
    expect(u).toMatchObject({ role: 'citizen', language: 'ur' })
    await expect(api.login('zainab@citizens.sahara.test', 'wrong')).rejects.toMatchObject({ code: 'UNAUTHENTICATED', status: 401 })
  })
  it('a citizen claim ends in a decision card (HUMAN for Zainab); resume code works; same key = same answer', async () => {
    await loginAs('zainab@citizens.sahara.test', '246810')
    const c = await api.createCase()
    await api.grantConsent({ grantee_type: 'office', purpose: 'claim', fields: ['name'] })
    const saved = await api.saveDraft(c.id, 4, { x: 1 }, 'k1')
    const again = await api.saveDraft(c.id, 4, { x: 1 }, 'k1')
    expect(again).toEqual(saved)
    expect(saved.resume_code).toMatch(/^\d{6}$/)
    const r = await api.resume(saved.resume_code)
    expect(r).toMatchObject({ case_id: c.id, step: 4, draft: { x: 1 } })
    const card = await api.submit(c.id)
    for (const k of CARD_KEYS) expect(card).toHaveProperty(k)
    expect(card.zone).toBe('HUMAN')
    expect(card.reason_code).toBe('R_NAME_AMBIGUOUS')
    expect(card.explain_citizen.ur.length).toBeGreaterThan(5)
  })
  it('an ask-more family gives ASK_MORE, a clean one AUTO', async () => {
    await loginAs('yousuf@helpers.sahara.test', '246810')
    for (const [pid, zone] of [['p-mumtaz', 'ASK_MORE'], ['p-rukhsana', 'AUTO']] as const) {
      await api.helperSession(pid)
      const c = await api.createCase(pid)
      for (const dt of ['cnic_front', 'death_certificate'] as const) await api.uploadDocument(c.id, new Blob(['x']), 'ok.jpg', dt)
      if (pid === 'p-mumtaz') await api.uploadDocument(c.id, new Blob(['x']), 'ok.jpg', 'cnic_front')
      const card = await api.submit(c.id)
      expect(card.zone).toBe(zone)
    }
  })
  it('officer queue is sorted; above the limit a second, different officer must approve', async () => {
    await loginAs('admin1@gov.sahara.test', 'Admin#2026')
    const q = await api.queue()
    expect(q.length).toBeGreaterThanOrEqual(4)
    for (let i = 1; i < q.length; i++) expect(q[i - 1].priority).toBeGreaterThanOrEqual(q[i].priority)
    const big = q.find((x) => x.amount > 20000)!
    const first = await api.officerDecision(big.id, { decision: 'approve', note: '' })
    expect(first.needs_second_approver).toBe(true)
    await expect(api.officerDecision(big.id, { decision: 'approve', note: '' })).rejects.toMatchObject({ code: 'CONFLICT' })
    await loginAs('admin2@gov.sahara.test', 'Admin#2026')
    expect((await api.officerDecision(big.id, { decision: 'approve', note: '' })).status).toBe('approved')
  })
  it('withdrawn consent blocks the officer', async () => {
    await loginAs('admin1@gov.sahara.test', 'Admin#2026')
    await expect(api.officerDecision('case-q5', { decision: 'approve', note: '' })).rejects.toMatchObject({ code: 'CONSENT_REQUIRED' })
  })
  it('refuses what the role may not do (403 in the error format)', async () => {
    await loginAs('zainab@citizens.sahara.test', '246810')
    await expect(api.queue()).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 })
    await expect(api.activate('rs-2')).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
  it('rules: v1 active, v2 draft, twin, cost curve, validate, activate', async () => {
    await loginAs('admin@gov.sahara.test', 'Admin#2026')
    const sets = await api.ruleSets()
    expect(sets.map((s) => [s.version, s.status])).toEqual([[2, 'draft'], [1, 'active']])
    const tw = await api.twin('rs-2')
    expect(tw.changed).toBeGreaterThan(0)
    expect(Object.keys(tw.moves)[0]).toMatch(/->/)
    const cc = await api.costCurve({ wrong_approve: 100, wrong_reject: 20, review: 3 })
    expect(cc.points.length).toBeGreaterThan(20)
    expect(cc.min.expected_cost).toBeLessThanOrEqual(Math.min(...cc.points.map((p) => p.expected_cost)) + 1e-9)
    const bad = await request<{ ok: boolean }>('POST', '/rules/validate', { body: { expression: { bogus: [1] } } })
    expect(bad.ok).toBe(false)
    await api.activate('rs-2')
    expect((await api.ruleSets()).find((s) => s.id === 'rs-2')!.status).toBe('active')
  })
  it('the diary verifies, and a tampered row is found', async () => {
    await loginAs('admin@gov.sahara.test', 'Admin#2026')
    expect((await api.auditVerify()).intact).toBe(true)
    tamperAudit(2)
    const v = await api.auditVerify()
    expect(v.intact).toBe(false)
    expect(v.broken_at).toBe(2)
  })
  it('scam check gives reasons', async () => {
    await loginAs('asim@citizens.sahara.test', '246810')
    const r = await api.scamCheck('Send Rs 500 fee and your PIN urgent http://bit.ly/x', '0300111')
    expect(r.label).toBe('scam')
    expect(r.reasons.map((x) => x.code)).toContain('ASKS_PIN_OR_OTP')
    expect((await api.scamCheck('Your payment is ready. Visit the office.', '9171')).label).toBe('safe')
  })
  it('the verify reply is read tolerantly', () => {
    expect(normaliseVerify({ ok: true })).toMatchObject({ intact: true })
    expect(normaliseVerify({ first_broken_row: 7 })).toMatchObject({ intact: false, broken_at: 7 })
  })
})
