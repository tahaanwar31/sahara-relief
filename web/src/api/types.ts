// Types written by hand from CONTRACT.md. Unknown fields from the service are ignored.
// Shapes that CONTRACT.md leaves open are marked "ASSUMED" (see web/ISSUES.md).

export type Zone = 'AUTO' | 'ASK_MORE' | 'HUMAN'
export type Result = 'APPROVE' | 'HOLD' | 'ASK_PROOF' | 'HUMAN_REVIEW' | 'REJECT'
export type CaseStatus =
  | 'draft' | 'submitted' | 'awaiting_proof' | 'in_review' | 'approved' | 'rejected' | 'paid' | 'stopped' | 'closed'
export type Role = 'citizen' | 'helper' | 'admin'
export type ConsentStatus = 'granted' | 'withdrawn' | 'expired'
export type RuleStatus = 'draft' | 'active' | 'retired'
export type RuleOutcome = 'PASS' | 'HOLD' | 'ASK_MORE'
export type MatchBand = 'SAME' | 'MAYBE' | 'DIFFERENT'
export type CheckVerdict = 'pass' | 'fail' | 'unsure' | 'skip'
export type ScamLabel = 'safe' | 'suspicious' | 'scam'
export type DocType = 'cnic_front' | 'cnic_back' | 'death_certificate' | 'utility_bill' | 'b_form' | 'other'
export type Lang = 'ur' | 'en'

export interface ApiErrorBody {
  error: { code: string; message: string; message_ur?: string; details?: unknown; request_id?: string }
}

export interface User { id: string; role: Role; name: string; language: Lang; office?: string | null }
export interface LoginResponse { access_token: string; expires_in: number; user: User }

export interface Bilingual { en: string; ur: string; officer?: string; std?: string }

export interface Check {
  name: string
  verdict: CheckVerdict
  confidence?: number
  detail?: string
  reason_code?: string | null
}

export interface TraceStep { step: number; what: string; rule?: string; fired?: boolean; [k: string]: unknown }

export interface DecisionCard {
  decision_id: string
  case_id: string
  created_at: string
  actor_type: 'user' | 'ai' | 'job' | 'system'
  zone: Zone
  result: Result
  reason_code: string
  confidence: number
  p_eligible?: number
  rule_version: number
  rule_checksum?: string
  model_version?: string
  checks: Check[]
  explain_citizen: Bilingual
  trace: TraceStep[]
  next_step?: { type: string; doc_type?: DocType | "cnic_both" | null; due_date?: string | null } | null
  case_notes_id?: string | null
  costs_used?: Costs
  approve_line?: number
  reject_line?: number
}

export interface Costs { wrong_approve: number; wrong_reject: number; review: number; proof: number }

export interface PersonInfo {
  id: string
  name_roman: string
  name_ur?: string
  cnic_masked?: string
  district?: string
  father_or_husband?: string
  gender?: string
}
export interface HouseholdInfo { id: string; members: number; district?: string; pmt_score?: number | null }

export interface DocumentInfo {
  id: string
  doc_type: DocType
  verdict?: 'ok' | 'ask_better_photo' | 'suspicious' | string
  signals?: DocSignals
  uploaded_at?: string
}
export interface DocSignals {
  blur_score?: number
  is_blurry?: boolean
  qr?: { found: boolean; payload?: string | null; valid?: boolean | null }
  cnic_numbers?: string[]
  duplicate_of?: string | null
  edit_signs?: string[]
  confidence?: number
}
export interface DocAnalysis { signals: DocSignals; verdict: 'ok' | 'ask_better_photo' | 'suspicious'; id?: string }

// ASSUMED: GET /cases/{id} returns the cases row plus joined person, household, documents, latest decision, consent.
export interface CaseDetail {
  id: string
  status: CaseStatus
  zone?: Zone | null
  result?: Result | null
  amount: number
  quarter: string
  step: number
  resume_code?: string | null
  office?: string
  payout_account?: string | null
  payout_account_title?: string | null
  draft?: Record<string, unknown> | null
  priority?: number
  created_at?: string
  updated_at?: string
  owner_user_id?: string
  helper_user_id?: string | null
  assigned_officer?: string | null
  person?: PersonInfo
  household?: HouseholdInfo
  documents?: DocumentInfo[]
  latest_decision?: DecisionCard | null
  consent_status?: ConsentStatus | 'none'
  needs_second_approver?: boolean
}

// ASSUMED: queue rows are the case plus the facts an officer needs at a glance.
export interface QueueItem {
  id: string
  status: CaseStatus
  zone: Zone
  result?: Result
  reason_code: string
  confidence: number
  priority: number
  amount: number
  quarter?: string
  person_name?: string
  person_name_ur?: string
  office?: string
  created_at: string
  consent_status?: ConsentStatus | 'none'
  needs_second_approver?: boolean
}

export interface DraftSaved { saved_at: string; resume_code: string }
// ASSUMED: resume lookup returns the case id, the step and the saved draft.
export interface ResumeInfo { case_id: string; step: number; draft: Record<string, unknown>; status?: CaseStatus }

export interface Consent {
  id: string
  subject_id?: string
  grantee_type: 'office' | 'helper' | 'service'
  grantee_id?: string | null
  grantee_name?: string
  purpose: string
  fields: string[]
  status: ConsentStatus
  granted_at: string
  withdrawn_at?: string | null
  expires_at?: string | null
  version?: number
  person_id?: string
}
export interface ConsentInput { grantee_type: Consent['grantee_type']; purpose: string; fields: string[]; person_id?: string; grantee_id?: string; subject_pin?: string }

// ASSUMED shape of GET /data-access-log
export interface AccessLogEntry { id: string; at: string; who: string; role?: string; what: string; purpose?: string }

export interface Family {
  person_id: string
  name_roman: string
  name_ur?: string
  cnic_last4: string
  district?: string
  consent_status: ConsentStatus | 'none'
  case_status?: CaseStatus | null
  case_id?: string | null
}
export interface HelperSession { person_id: string | null; active: boolean; started_at?: string | null; person?: PersonInfo }

export interface RuleParams {
  programme: string
  cutoff: number
  borderline_band: number
  amount: number
  payout_cap: number
  auto_reject_enabled: boolean
  second_approver_over: number
  costs: Costs
}
export interface Rule {
  id?: string
  code: string
  expression: unknown
  outcome: RuleOutcome
  reason_code: string
  reason_en?: string
  reason_ur?: string
}
export interface RuleSet {
  id: string
  version: number
  status: RuleStatus
  params: RuleParams
  checksum?: string
  parent_version?: number | null
  created_by?: string
  created_at?: string
  effective_from?: string | null
  effective_to?: string | null
  rules?: Rule[]
}
// ASSUMED: POST /rule-sets body (a new draft) and POST /rules/validate reply.
export interface NewRuleSetInput { parent_id?: string; params: RuleParams; rules: Rule[] }
export interface ValidateReply { ok: boolean; errors: { path: string; message: string }[] }

export interface TwinResult {
  cases: number
  changed: number
  moves: Record<string, number>
  approvals_changed?: number
  cost_before?: number
  cost_after?: number
  examples?: TwinExample[]
}
export interface TwinExample {
  case_id: string
  name?: string
  before: { zone: Zone; result?: Result; reason_code?: string }
  after: { zone: Zone; result?: Result; reason_code?: string }
  note?: string
}

// ASSUMED shape of GET /policy/cost-curve
export interface CostCurve {
  points: { approve_line: number; expected_cost: number }[]
  min: { approve_line: number; expected_cost: number }
  current?: { approve_line: number; expected_cost: number }
  costs?: Partial<Costs>
}

export interface EvalLatest {
  run_id?: string
  created_at?: string
  n: number
  accuracy?: number
  auto_rate?: number
  human_rate?: number
  confusion: { labels: string[]; matrix: number[][] }
  false_alarms: { case: string; truth: string; predicted: string; zone?: string; note?: string }[]
  speed?: { p50_ms?: number; p95_ms?: number; per_case_ms?: number }
  cost?: number
  notes?: string
}
export interface AnalyticsSummary {
  cases_total: number
  by_zone: Partial<Record<Zone, number>>
  by_status?: Record<string, number>
  queue_open?: number
  avg_decision_ms?: number
  override_rate?: number
  scam_checked?: number
}

export interface AuditEntry {
  id: number | string
  ts: string
  actor_id?: string | null
  actor_name?: string
  actor_type: string
  actor_role?: string | null
  action: string
  entity_type: string
  entity_id?: string | null
  rule_version?: number | null
  model_version?: string | null
  confidence?: number | null
  result?: string | null
  details?: Record<string, unknown>
  prev_hash?: string
  hash?: string
}
export interface AuditPage { items: AuditEntry[]; total?: number }
// Tolerant: the verify reply may name its fields differently.
export interface AuditVerify { intact: boolean; broken_at: number | string | null; checked?: number }

export interface ScamReason { code: string; en: string; ur: string }
export interface ScamResult { label: ScamLabel; score: number; reasons: ScamReason[]; advice: Bilingual }

export interface IdentityLookup {
  found: boolean
  /** true only when the number is the one linked to this claim's person; details come back only then */
  same_person: boolean
  record: { name_roman: string; name_ur: string; father_or_husband?: string; dob?: string; gender?: string; district?: string; cnic_masked?: string } | null
}
export interface IdentityMatch {
  band: MatchBand
  score: number
  evidence: { field: string; a: string | null; b: string | null; agree: 'yes' | 'no' | 'missing' | 'close'; weight: number }[]
  reason_code: string | null
}
// ASSUMED: POST /mock/raast/verify {account} -> title
export interface AccountCheck { valid: boolean; title?: string | null; shared_with_other_households?: boolean }

export interface CaseNotes {
  id: string
  case_id: string
  decision_id?: string
  created_at?: string
  // ASSUMED package fields
  package: {
    summary?: Bilingual | string
    why_unsure?: string[]
    checked?: { name: string; verdict: CheckVerdict; detail?: string }[]
    missing?: string[]
    suggested?: string[]
    compare?: { field: string; record_a: string; record_b: string; agree: string; card?: string; card_agree?: string }[]
    [k: string]: unknown
  }
}

export interface OfficerDecisionInput { decision: 'approve' | 'reject' | 'ask_more' | 'hold'; note: string; doc_type?: 'cnic_front' | 'cnic_back' | 'cnic_both' | 'other' }
// ASSUMED reply
export interface OfficerDecisionReply { case_id: string; status: CaseStatus; needs_second_approver?: boolean; decision?: DecisionCard; message?: string }
