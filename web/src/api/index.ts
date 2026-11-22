// The typed API: one function per contract endpoint. The screens never build URLs by hand.
import { get, post, put, request, getToken } from './client'
import type * as T from './types'

export * from './types'
export { ApiError, NetworkError, API_MODE, API_BASE, IS_DEV_UI, errorText, setToken, getToken, setTransport, setUnauthenticatedHandler, newKey, request, toApiError } from './client'

const q = (o: Record<string, string | number | boolean | undefined | null>) => o

export const api = {
  // auth
  login: (email: string, secret: string) => post<T.LoginResponse>('/auth/login', { email, secret }),
  me: () => get<T.User>('/me'),
  health: () => get<{ status: string }>('/healthz'),

  // cases
  createCase: (person_id?: string, key?: string) => post<T.CaseDetail>('/cases', person_id ? { person_id } : {}, { idempotencyKey: key }),
  resetHelper: () => post<{ families_reset: number }>('/demo/reset-helper', {}),
  restartClaim: () => post<{ closed: number }>('/demo/restart-claim', {}),
  listCases: () => get<T.CaseDetail[] | { items: T.CaseDetail[] }>('/cases').then(items),
  getCase: (id: string) => get<T.CaseDetail>(`/cases/${id}`),
  saveDraft: (id: string, step: number, draft: Record<string, unknown>, key?: string) =>
    put<T.DraftSaved>(`/cases/${id}/draft`, { step, draft }, { idempotencyKey: key }),
  resume: (code: string) => get<T.ResumeInfo>(`/drafts/resume/${encodeURIComponent(code)}`),
  uploadDocument: (id: string, file: Blob, fileName: string, doc_type: T.DocType, key?: string) => {
    const form = new FormData()
    form.append('file', file, fileName)
    form.append('doc_type', doc_type)
    return request<T.DocAnalysis>('POST', `/cases/${id}/documents`, { form, idempotencyKey: key })
  },
  submit: (id: string, key?: string) => post<T.DecisionCard>(`/cases/${id}/submit`, {}, { idempotencyKey: key }),
  decide: (id: string) => post<T.DecisionCard>(`/cases/${id}/decide`, {}),
  decisions: (id: string) => get<T.DecisionCard[] | { items: T.DecisionCard[] }>(`/cases/${id}/decisions`).then(items),
  notes: (id: string) => get<T.CaseNotes>(`/cases/${id}/notes`),
  queue: () => get<T.QueueItem[] | { items: T.QueueItem[] }>('/queue').then(items),
  officerDecision: (id: string, body: T.OfficerDecisionInput, key?: string) =>
    post<T.OfficerDecisionReply>(`/cases/${id}/officer-decision`, body, { idempotencyKey: key }),

  // consent
  consents: (person_id?: string) => get<T.Consent[] | { items: T.Consent[] }>('/consents', q({ person_id })).then(items),
  grantConsent: (body: T.ConsentInput) => post<T.Consent>('/consents', body),
  withdrawConsent: (id: string) => post<T.Consent>(`/consents/${id}/withdraw`, {}),
  accessLog: () => get<T.AccessLogEntry[] | { items: T.AccessLogEntry[] }>('/data-access-log').then(items),

  // helper
  families: () => get<T.Family[] | { items: T.Family[] }>('/helper/families').then(items),
  helperSession: (person_id: string | null) => post<T.HelperSession>('/helper/session', { person_id }),

  // checks
  documentImage: (caseId: string, docId: string) => get<{ content_type: string; doc_type: string; data: string }>(`/cases/${caseId}/documents/${docId}/image`),
  householdCheck: (caseId: string, members: number) => post<{ match: boolean; locked: boolean; tries_left: number }>(`/cases/${caseId}/household-check`, { members }),
  helperVerifyFamily: (body: { cnic: string; dob: string; members: number }) => post<{ ok: boolean; person_id: string }>('/helper/verify-family', body),
  identityLookup: (caseId: string, cnic: string) => post<T.IdentityLookup>(`/cases/${caseId}/identity-lookup`, { cnic }),
  identityMatch: (a: Record<string, unknown>, b: Record<string, unknown>) => post<T.IdentityMatch>('/identity/match', { a, b }),
  verifyAccount: (account: string) => post<T.AccountCheck>('/mock/raast/verify', { account }),
  scamCheck: (text: string, sender?: string) => post<T.ScamResult>('/scam/check', { text, sender: sender || undefined }),
  scamReport: (text: string, sender?: string) => post<unknown>('/scam/report', { text, sender: sender || undefined }),

  // audit
  audit: (p: { action?: string; entity_type?: string; actor_id?: string; limit?: number; offset?: number } = {}) =>
    get<T.AuditEntry[] | T.AuditPage>('/audit', q(p)).then((r) => (Array.isArray(r) ? { items: r } : r)),
  auditMine: () => get<T.AuditEntry[] | T.AuditPage>('/audit/mine').then((r) => (Array.isArray(r) ? { items: r } : r)),
  auditVerify: () => get<Record<string, unknown>>('/audit/verify').then(normaliseVerify),

  // rules
  ruleSets: () => get<T.RuleSet[] | { items: T.RuleSet[] }>('/rule-sets').then(items),
  ruleSet: (id: string) => get<T.RuleSet>(`/rule-sets/${id}`),
  newRuleSet: (body: T.NewRuleSetInput) => post<T.RuleSet>('/rule-sets', body),
  validateRules: (body: { params?: T.RuleParams; rules?: T.Rule[]; expression?: unknown }) => post<T.ValidateReply>('/rules/validate', body),
  activate: (rule_set_id: string) => post<T.RuleSet>('/rules/activate', { rule_set_id }),
  twin: (rule_set_id: string, limit = 500) => post<T.TwinResult>('/rules/twin', { rule_set_id, limit }),
  costCurve: (c: { wrong_approve: number; wrong_reject: number; review: number }) => get<T.CostCurve>('/policy/cost-curve', c),

  // evaluation
  evalLatest: () => get<T.EvalLatest>('/eval/latest'),
  evalRun: () => post<T.EvalLatest>('/eval/run', {}),
  analytics: () => get<T.AnalyticsSummary>('/analytics/summary'),
}

function items<X>(r: X[] | { items: X[] }): X[] { return Array.isArray(r) ? r : (r?.items ?? []) }

/** The verify reply is read tolerantly: ok / intact, and the first broken row under a few names. */
export function normaliseVerify(r: Record<string, unknown>): T.AuditVerify {
  const broken = (r.broken_at ?? r.first_broken_row ?? r.first_broken ?? r.broken_row ?? null) as number | string | null
  const intact = typeof r.intact === 'boolean' ? r.intact : typeof r.ok === 'boolean' ? r.ok : broken === null
  return { intact: broken !== null ? false : intact, broken_at: broken, checked: (r.checked ?? r.rows_checked) as number | undefined }
}

export const hasToken = () => !!getToken()
