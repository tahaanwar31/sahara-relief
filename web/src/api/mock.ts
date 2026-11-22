// MOCK API MODE: an in-browser stand-in for the Python service. It follows the shapes in CONTRACT.md.
// Everything here is synthetic. It keeps its state in localStorage so a second tab acts like a second phone.
// Not a security boundary: it only imitates the service so the screens can be built and shown without it.
import { NetworkError, type Req, type Res, type Transport } from './client'
import type {
  CaseDetail, Consent, DecisionCard, DocType, Rule, RuleParams, RuleSet, ScamResult, User, Zone, AuditEntry, Check,
} from './types'
import { validateExpression } from '../rules/jsonlogic'
import { validateSet } from '../rules/validate'
import reasons from '../data/reasons.json'

const R = reasons.decision as Record<string, { zone: Zone; en: string; ur: string }>
const S = reasons.scam as Record<string, { en: string; ur: string }>

// ---------------------------------------------------------------- seed data
const PW = '246810'
const USERS: (User & { email: string; secret: string; person_id?: string })[] = [
  { id: 'u-zainab', email: 'zainab@citizens.sahara.test', secret: PW, role: 'citizen', name: 'Zainab Bibi', language: 'ur', person_id: 'p-zainab' },
  { id: 'u-yousuf', email: 'yousuf@helpers.sahara.test', secret: PW, role: 'helper', name: 'Yousuf Khan', language: 'ur' },
  { id: 'u-asim', email: 'asim@citizens.sahara.test', secret: PW, role: 'citizen', name: 'Asim Raza', language: 'ur', person_id: 'p-asim' },
  { id: 'u-off1', email: 'admin1@gov.sahara.test', secret: 'Admin#2026', role: 'admin', name: 'Reviewer One', language: 'en', office: 'KHI-EAST' },
  { id: 'u-off2', email: 'admin2@gov.sahara.test', secret: 'Admin#2026', role: 'admin', name: 'Reviewer Two', language: 'en', office: 'KHI-EAST' },
  { id: 'u-admin', email: 'admin@gov.sahara.test', secret: 'Admin#2026', role: 'admin', name: 'Admin', language: 'en' },
]

interface Person {
  id: string; name: string; name_ur: string; cnic: string; father: string; district: string
  members: number; pmt: number; scenario: 'auto' | 'ask' | 'human'; account: string; amount?: number; owner?: string
  humanCode?: string
}
const PEOPLE: Person[] = [
  { id: 'p-zainab', name: 'Zainab Bibi', name_ur: 'زینب بی بی', cnic: '4210112345671', father: 'Abdul Rehman', district: 'Karachi East', members: 5, pmt: 22.4, scenario: 'human', humanCode: 'R_NAME_AMBIGUOUS', account: '03001234567' },
  { id: 'p-asim', name: 'Asim Raza', name_ur: 'عاصم رضا', cnic: '4210198765433', father: 'Raza Ali', district: 'Karachi East', members: 4, pmt: 18.0, scenario: 'auto', account: '03211112222' },
  { id: 'p-rukhsana', name: 'Rukhsana Bibi', name_ur: 'رخسانہ بی بی', cnic: '4210155512341', father: 'Ghulam Nabi', district: 'Karachi East', members: 4, pmt: 17.2, scenario: 'auto', account: '03007770001' },
  { id: 'p-mumtaz', name: 'Mumtaz Begum', name_ur: 'ممتاز بیگم', cnic: '4210155512342', father: 'Allah Bakhsh', district: 'Karachi East', members: 6, pmt: 21.0, scenario: 'ask', account: '03007770002' },
  { id: 'p-kausar', name: 'Kausar Parveen', name_ur: 'کوثر پروین', cnic: '4210155512343', father: 'Muhammad Yaqoob', district: 'Karachi East', members: 3, pmt: 26.5, scenario: 'human', humanCode: 'R_PAYOUT_ACCOUNT_SHARED', account: '03007770003' },
  { id: 'p-nasreen', name: 'Nasreen Akhtar', name_ur: 'نسرین اختر', cnic: '4210155512344', father: 'Akhtar Hussain', district: 'Karachi East', members: 5, pmt: 15.5, scenario: 'auto', account: '03007770004' },
  { id: 'p-shamim', name: 'Shamim Bano', name_ur: 'شمیم بانو', cnic: '4210155512345', father: 'Noor Muhammad', district: 'Karachi East', members: 7, pmt: 28.8, scenario: 'human', humanCode: 'R_PMT_BORDERLINE', account: '03007770005' },
  { id: 'p-farida', name: 'Farida Khatoon', name_ur: 'فریدہ خاتون', cnic: '4210155512346', father: 'Imam Bakhsh', district: 'Karachi East', members: 2, pmt: 12.9, scenario: 'auto', account: '03007770006' },
  // officer queue people
  { id: 'p-q1', name: 'Mohd Aslam', name_ur: 'محمد اسلم', cnic: '4210100000011', father: 'Abd ur Rehman', district: 'Karachi East', members: 6, pmt: 29.6, scenario: 'human', humanCode: 'R_DUPLICATE_IDENTITY', account: '03451230001' },
  { id: 'p-q2', name: 'Sakina Bibi', name_ur: 'سکینہ بی بی', cnic: '4210100000022', father: 'Karim Dad', district: 'Karachi East', members: 8, pmt: 24.0, scenario: 'human', humanCode: 'R_PAYOUT_OVER_CAP', account: '03451230002', amount: 24000 },
  { id: 'p-q3', name: 'Gulshan Ara', name_ur: 'گلشن آرا', cnic: '4210100000033', father: 'Ahmed Din', district: 'Karachi East', members: 4, pmt: 33.1, scenario: 'human', humanCode: 'R_PMT_ABOVE_CUTOFF', account: '03451230003' },
  { id: 'p-q4', name: 'Hajra Naz', name_ur: 'ہاجرہ ناز', cnic: '4210100000044', father: 'Naseer Ahmed', district: 'Karachi East', members: 3, pmt: 20.2, scenario: 'human', humanCode: 'R_DOC_EDITED', account: '03451230004' },
  { id: 'p-q5', name: 'Bilquis Jahan', name_ur: 'بلقیس جہاں', cnic: '4210100000055', father: 'Jahan Khan', district: 'Karachi East', members: 5, pmt: 23.7, scenario: 'human', humanCode: 'R_CNIC_EXPIRED', account: '03451230005' },
]
const person = (id: string) => PEOPLE.find((p) => p.id === id)!
const ACCOUNT_TITLES: Record<string, string> = {
  '03001234567': 'ZAINAB BIBI W/O ASLAM', '03211112222': 'ASIM RAZA', '03007770001': 'RUKHSANA BIBI', '03007770002': 'MUMTAZ BEGUM',
  '03007770003': 'KAUSAR PARVEEN', '03007770004': 'NASREEN AKHTAR', '03007770005': 'SHAMIM BANO', '03007770006': 'FARIDA KHATOON',
  '03339998877': 'YOUSUF KHAN (HELPER)',
}

// ---------------------------------------------------------------- rules
const BASE_PARAMS: RuleParams = {
  programme: 'Sahara Relief Programme (MOCK)', cutoff: 30, borderline_band: 5, amount: 13500, payout_cap: 29000,
  auto_reject_enabled: false, second_approver_over: 20000, costs: { wrong_approve: 100, wrong_reject: 20, review: 3, proof: 1 },
}
const BASE_RULES: Rule[] = [
  { code: 'EXCL_GOV_EMPLOYEE', expression: { '==': [{ var: 'household.flags.gov_employee' }, true] }, outcome: 'HOLD', reason_code: 'R_EXCLUSION_HIT' },
  { code: 'EXCL_VEHICLE_AND_TAX', expression: { and: [{ '==': [{ var: 'household.flags.owns_vehicle' }, true] }, { '==': [{ var: 'household.flags.tax_filer' }, true] }] }, outcome: 'HOLD', reason_code: 'R_EXCLUSION_HIT' },
  { code: 'PMT_MISSING', expression: { missing: ['household.pmt_score'] }, outcome: 'HOLD', reason_code: 'R_PMT_MISSING' },
  { code: 'DOC_MISSING', expression: { '==': [{ var: 'doc.required_missing' }, true] }, outcome: 'ASK_MORE', reason_code: 'R_DOC_MISSING' },
  { code: 'DOC_BLURRY', expression: { '==': [{ var: 'doc.any_blurry' }, true] }, outcome: 'ASK_MORE', reason_code: 'R_DOC_BLURRY' },
  { code: 'DOC_EDITED', expression: { '==': [{ var: 'doc.any_edited' }, true] }, outcome: 'HOLD', reason_code: 'R_DOC_EDITED' },
  { code: 'PAYOUT_SHARED', expression: { '==': [{ var: 'payout.shared_with_other_households' }, true] }, outcome: 'HOLD', reason_code: 'R_PAYOUT_ACCOUNT_SHARED' },
  { code: 'PAYOUT_CHANGED_RECENTLY', expression: { '<': [{ var: 'payout.changed_within_days' }, 30] }, outcome: 'HOLD', reason_code: 'R_PAYOUT_ACCOUNT_CHANGED' },
  { code: 'ID_EXPIRED', expression: { '==': [{ var: 'person.cnic_expired' }, true] }, outcome: 'HOLD', reason_code: 'R_CNIC_EXPIRED' },
]
const withText = (rs: Rule[]): Rule[] => rs.map((r, i) => ({ ...r, id: 'r-' + i, reason_en: R[r.reason_code]?.en, reason_ur: R[r.reason_code]?.ur }))

// ---------------------------------------------------------------- state
interface Mem {
  cases: Record<string, CaseRec>
  consents: Consent[]
  ruleSets: (RuleSet & { rules: Rule[] })[]
  audit: AuditEntry[]
  idem: Record<string, Res>
  helperActive: string | null
  scamCount: number
  accessLog: { id: string; at: string; who: string; role: string; what: string; purpose: string }[]
  nextId: number
}
interface CaseRec extends CaseDetail { approvals?: string[]; decisions: DecisionCard[]; uploads: number; held?: boolean; note_pkg?: unknown }

const LS = 'sahara.mock.v1'
let mem: Mem
let delay = 80
export function setMockDelay(ms: number) { delay = ms }

const iso = (d = new Date()) => d.toISOString()
const hoursAgo = (h: number) => iso(new Date(Date.now() - h * 3600_000))

function hashText(s: string): string {
  // simple readable chain hash for the mock (the real service uses sha256 in the database)
  let h1 = 0x811c9dc5, h2 = 0x1b873593
  for (let i = 0; i < s.length; i++) { h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619); h2 = Math.imul(h2 ^ s.charCodeAt(i), 2246822519) }
  return ((h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0')).repeat(4)
}
function rowText(e: AuditEntry) { return [e.id, e.ts, e.actor_id, e.action, e.entity_type, e.entity_id, e.result, e.rule_version].join('|') }
function addAudit(actor: { id?: string; role?: string; type?: string }, action: string, entity_type: string, entity_id: string | null, extra: Partial<AuditEntry> = {}) {
  const prev = mem.audit[mem.audit.length - 1]?.hash ?? '0'.repeat(64)
  const e: AuditEntry = {
    id: mem.audit.length + 1, ts: iso(), actor_id: actor.id ?? null, actor_type: actor.type ?? 'user', actor_role: actor.role ?? null,
    action, entity_type, entity_id, ...extra, prev_hash: prev, hash: '',
  }
  e.hash = hashText(prev + rowText(e))
  mem.audit.push(e)
}

function seed(): Mem {
  const m: Mem = { cases: {}, consents: [], ruleSets: [], audit: [], idem: {}, helperActive: null, scamCount: 0, accessLog: [], nextId: 100 }
  mem = m
  const v1: RuleSet & { rules: Rule[] } = {
    id: 'rs-1', version: 1, status: 'active', params: BASE_PARAMS, checksum: 'sha256-' + hashText('v1').slice(0, 24), parent_version: null,
    created_by: 'u-admin', created_at: hoursAgo(500), effective_from: hoursAgo(499), effective_to: null, rules: withText(BASE_RULES),
  }
  const v2: RuleSet & { rules: Rule[] } = {
    id: 'rs-2', version: 2, status: 'draft', params: { ...BASE_PARAMS, cutoff: 25, amount: 14500 }, checksum: 'sha256-' + hashText('v2').slice(0, 24),
    parent_version: 1, created_by: 'u-admin', created_at: hoursAgo(30), effective_from: null, effective_to: null, rules: withText(BASE_RULES),
  }
  m.ruleSets = [v1, v2]
  addAudit({ id: 'u-admin', role: 'admin' }, 'rule_set.created', 'rule_sets', 'rs-1', { rule_version: 1, result: 'ok' })
  addAudit({ id: 'u-admin', role: 'admin' }, 'rule_set.activated', 'rule_sets', 'rs-1', { rule_version: 1, result: 'ok' })
  addAudit({ id: 'u-admin', role: 'admin' }, 'rule_set.created', 'rule_sets', 'rs-2', { rule_version: 2, result: 'ok' })

  // consents: Zainab (office + helper + service); every family has consent except one withdrawn
  const consentFor = (pid: string, status: 'granted' | 'withdrawn' = 'granted') => {
    for (const [gt, name] of [['office', 'Office KHI-EAST'], ['service', 'Payment check (mock)']] as const) {
      m.consents.push({
        id: `c-${pid}-${gt}`, person_id: pid, grantee_type: gt, grantee_name: name, purpose: 'claim', fields: gt === 'office' ? ['name', 'cnic', 'household'] : ['account'],
        status, granted_at: hoursAgo(72), withdrawn_at: status === 'withdrawn' ? hoursAgo(5) : null, version: 1,
      })
    }
  }
  ;['p-zainab', 'p-asim', 'p-rukhsana', 'p-mumtaz', 'p-kausar', 'p-nasreen', 'p-farida', 'p-q1', 'p-q2', 'p-q3', 'p-q4'].forEach((p) => consentFor(p))
  consentFor('p-q5', 'withdrawn')
  m.consents.push({ id: 'c-p-zainab-helper', person_id: 'p-zainab', grantee_type: 'helper', grantee_name: 'Yousuf Khan (helper)', purpose: 'help', fields: ['name', 'cnic'], status: 'granted', granted_at: hoursAgo(70), version: 1 })
  m.accessLog = [
    { id: 'a1', at: hoursAgo(70), who: 'Yousuf Khan', role: 'helper', what: 'Name, ID number', purpose: 'Helping with the claim' },
    { id: 'a2', at: hoursAgo(20), who: 'Payment check (mock)', role: 'service', what: 'Account number', purpose: 'Check the account title' },
    { id: 'a3', at: hoursAgo(3), who: 'Officer One', role: 'officer', what: 'Name, household', purpose: 'Review of my case' },
  ]

  // officer queue: five cases waiting, different reasons
  PEOPLE.filter((p) => p.id.startsWith('p-q')).forEach((p, i) => {
    const id = `case-q${i + 1}`
    const c = baseCase(id, p, 'in_review', 'u-q' + (i + 1))
    c.created_at = hoursAgo(8 + i * 11)
    c.updated_at = c.created_at
    c.documents = [
      { id: `d-${id}-1`, doc_type: 'cnic_front', verdict: 'ok', signals: { blur_score: 0.12, is_blurry: false, confidence: 0.91, cnic_numbers: [p.cnic] } },
      { id: `d-${id}-2`, doc_type: 'death_certificate', verdict: p.humanCode === 'R_DOC_EDITED' ? 'suspicious' : 'ok', signals: { blur_score: 0.2, is_blurry: false, confidence: 0.84, edit_signs: p.humanCode === 'R_DOC_EDITED' ? ['font mismatch near date'] : [] } },
    ]
    c.consent_status = p.id === 'p-q5' ? 'withdrawn' : 'granted'
    const d = makeDecision(c, p, [])
    c.decisions = [d]
    c.zone = d.zone
    c.result = d.result
    c.latest_decision = d
    c.priority = Math.round(((p.amount ?? 13500) / 1000) * (1 + i * 0.4) * 10) / 10
    c.note_pkg = notesFor(d, p)
    m.cases[id] = c
  })
  persist()
  return m
}

function load(): Mem {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LS) : null
    if (raw) { mem = JSON.parse(raw) as Mem; return mem }
  } catch { /* fall through to a fresh seed */ }
  return seed()
}
function persist() {
  try { localStorage.setItem(LS, JSON.stringify(mem)) } catch { /* ignore */ }
}
/** Dev helper: wipe the pretend database. */
export function resetMock() { try { localStorage.removeItem(LS) } catch { /* ignore */ } seed() }

// ---------------------------------------------------------------- builders
function baseCase(id: string, p: Person, status: CaseDetail['status'], owner: string): CaseRec {
  return {
    id, status, zone: null, result: null, amount: p.amount ?? 13500, quarter: '2026-Q4', step: 1, resume_code: null, office: 'KHI-EAST',
    payout_account: p.account, payout_account_title: ACCOUNT_TITLES[p.account] ?? null, draft: {}, priority: 1, created_at: iso(), updated_at: iso(),
    owner_user_id: owner, helper_user_id: null, assigned_officer: null, documents: [], decisions: [], uploads: 0,
    person: { id: p.id, name_roman: p.name, name_ur: p.name_ur, cnic_masked: p.cnic.slice(0, 5) + '*****' + p.cnic.slice(-3), district: p.district, father_or_husband: p.father, gender: 'F' },
    household: { id: 'h-' + p.id, members: p.members, district: p.district, pmt_score: p.pmt },
    consent_status: 'granted',
  }
}

const reasonCard = (code: string) => ({ en: R[code].en, ur: R[code].ur })

function makeDecision(c: CaseRec, p: Person, docs: NonNullable<CaseRec['documents']>): DecisionCard {
  const consent = mem.consents.filter((x) => x.person_id === p.id && x.grantee_type === 'office')
  const hasConsent = consent.some((x) => x.status === 'granted')
  const required: DocType[] = ['cnic_front', 'death_certificate']
  const have = new Set(docs.filter((d) => d.verdict === 'ok').map((d) => d.doc_type))
  const missing = required.filter((r) => !have.has(r))
  const blurry = docs.some((d) => d.signals?.is_blurry)
  const helperOwned = c.payout_account === '03339998877'
  const params = activeSet().params

  let code = 'R_AUTO_APPROVED'
  let conf = 0.985
  const checks: Check[] = []
  checks.push({ name: 'consent', verdict: hasConsent ? 'pass' : 'fail', confidence: 1, detail: hasConsent ? `active consent ${consent[0]?.id}` : 'no active consent', reason_code: hasConsent ? null : 'R_CONSENT_MISSING' })
  const idUnsure = p.humanCode === 'R_NAME_AMBIGUOUS' || p.humanCode === 'R_DUPLICATE_IDENTITY'
  checks.push({ name: 'identity_match', verdict: idUnsure ? 'unsure' : 'pass', confidence: idUnsure ? 0.62 : 0.97, detail: idUnsure ? 'band MAYBE' : 'band SAME', reason_code: idUnsure ? p.humanCode : null })
  checks.push({ name: 'household_score', verdict: p.pmt <= params.cutoff - params.borderline_band ? 'pass' : p.pmt <= params.cutoff ? 'unsure' : 'fail', confidence: 0.9, detail: `score ${p.pmt}, cutoff ${params.cutoff}` })
  checks.push({ name: 'documents', verdict: missing.length || blurry ? 'unsure' : 'pass', confidence: blurry ? 0.4 : 0.9, detail: missing.length ? 'missing: ' + missing.join(', ') : blurry ? 'a photo is blurry' : 'all papers read well', reason_code: blurry ? 'R_DOC_BLURRY' : missing.length ? 'R_DOC_MISSING' : null })
  checks.push({ name: 'payout_account', verdict: p.humanCode === 'R_PAYOUT_ACCOUNT_SHARED' || helperOwned ? 'fail' : 'pass', confidence: 0.95, detail: helperOwned ? 'owned by a helper' : p.humanCode === 'R_PAYOUT_ACCOUNT_SHARED' ? 'shared with 3 other households' : 'owned by the person' })

  if (!hasConsent) { code = 'R_CONSENT_MISSING'; conf = 0.5 }
  else if (helperOwned) { code = 'R_PAYOUT_HELPER_OWNED'; conf = 0.55 }
  else if (p.scenario === 'human') { code = p.humanCode ?? 'R_LOW_CONFIDENCE'; conf = idUnsure ? 0.62 : 0.58 }
  else if (blurry) { code = 'R_DOC_BLURRY'; conf = 0.4 }
  else if (missing.length) { code = 'R_DOC_MISSING'; conf = 0.5 }
  else if (p.scenario === 'ask' && !docs.some((d) => d.doc_type === 'utility_bill')) { code = 'R_DOC_MISSING'; conf = 0.7 }

  const zone = R[code].zone
  const result = zone === 'AUTO' ? 'APPROVE' : zone === 'ASK_MORE' ? 'ASK_PROOF' : 'HUMAN_REVIEW'
  const ask = zone === 'ASK_MORE'
  const nextDoc: DocType | null = !ask ? null : blurry ? (docs.find((d) => d.signals?.is_blurry)?.doc_type ?? 'cnic_front') : (missing[0] ?? 'utility_bill')
  const approve_line = 1 - params.costs.review / params.costs.wrong_approve
  const id = 'dec-' + (mem.nextId++)
  const due = new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10)
  return {
    decision_id: id, case_id: c.id, created_at: iso(), actor_type: 'ai', zone, result, reason_code: code, confidence: conf, p_eligible: conf,
    rule_version: activeSet().version, rule_checksum: activeSet().checksum, model_version: 'logreg-2026-11-21 (mock)', checks,
    explain_citizen: reasonCard(code),
    trace: [
      { step: 1, what: 'hard_rule', rule: 'NO_CONSENT', fired: !hasConsent },
      { step: 2, what: 'hard_rule', rule: 'PAYOUT_ACCOUNT', fired: helperOwned || p.humanCode === 'R_PAYOUT_ACCOUNT_SHARED' },
      { step: 3, what: 'hard_rule', rule: 'DOC_QUALITY', fired: blurry || missing.length > 0 },
      { step: 4, what: 'model', p_eligible: conf, approve_line },
      { step: 5, what: 'zone', zone, reason_code: code },
    ],
    next_step: { type: zone === 'AUTO' ? 'payment' : zone === 'ASK_MORE' ? 'send_proof' : 'human', doc_type: nextDoc, due_date: zone === 'HUMAN' ? due : null },
    case_notes_id: zone === 'HUMAN' ? 'notes-' + id : null,
    costs_used: params.costs, approve_line, reject_line: params.costs.review / params.costs.wrong_reject,
  }
}

function notesFor(d: DecisionCard, p: Person) {
  return {
    summary: { en: `The system is not sure (${Math.round(d.confidence * 100)}%). ${R[d.reason_code]?.en ?? ''}`, ur: R[d.reason_code]?.ur ?? '' },
    why_unsure: d.checks.filter((c) => c.verdict !== 'pass').map((c) => `${c.name}: ${c.detail ?? c.verdict}`),
    checked: d.checks.map((c) => ({ name: c.name, verdict: c.verdict, detail: c.detail })),
    missing: d.reason_code === 'R_DOC_MISSING' ? ['utility_bill'] : [],
    suggested: ['Look at the documents side by side', 'Call the helper if the name is unclear', 'Approve only if the name and father or husband agree'],
    compare: [
      { field: 'Name', record_a: p.name, record_b: p.name.replace('Mohd', 'Muhammad').replace('Bibi', 'Bibi w/o Aslam'), agree: 'close' },
      { field: 'Father / husband', record_a: p.father, record_b: p.father.replace('Abd ur', 'Abdul'), agree: 'close' },
      { field: 'ID number', record_a: p.cnic, record_b: p.cnic, agree: 'yes' },
      { field: 'District', record_a: p.district, record_b: p.district, agree: 'yes' },
    ],
  }
}

const activeSet = () => mem.ruleSets.find((r) => r.status === 'active')!

function mkCode(id: string) {
  let n = 0
  for (const ch of id) n = (n * 31 + ch.charCodeAt(0)) % 900000
  return String(100000 + n)
}

function ok(json: unknown, status = 200): Res { return { status, json } }
function fail(status: number, code: string, message: string, message_ur?: string): Res {
  return { status, json: { error: { code, message, message_ur: message_ur ?? message, details: {}, request_id: 'mock-' + Math.random().toString(36).slice(2, 8) } } }
}
const FORBIDDEN = () => fail(403, 'FORBIDDEN', 'You are not allowed to do this.', 'آپ کو اس کی اجازت نہیں ہے۔')

function publicCase(c: CaseRec): CaseDetail {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { approvals, decisions, uploads, held, note_pkg, ...rest } = c
  const over = c.amount > activeSet().params.second_approver_over
  return { ...rest, latest_decision: decisions[0] ?? null, needs_second_approver: over && (approvals?.length ?? 0) < 2 }
}

// ---------------------------------------------------------------- routing
type Ctx = { user: (typeof USERS)[number] | null; req: Req; params: string[]; body: Record<string, any> } // eslint-disable-line @typescript-eslint/no-explicit-any
type Handler = (c: Ctx) => Res | Promise<Res>
const routes: { method: string; re: RegExp; roles?: string[]; h: Handler }[] = []
const route = (method: string, pattern: string, h: Handler, roles?: string[]) => {
  routes.push({ method, re: new RegExp('^' + pattern.replace(/:[a-z_]+/g, '([^/]+)') + '$'), roles, h })
}
const actor = (u: Ctx['user']) => ({ id: u?.id, role: u?.role })

route('POST', '/auth/login', ({ body }) => {
  const u = USERS.find((x) => x.email === String(body.email).trim().toLowerCase() && x.secret === body.secret)
  if (!u) return fail(401, 'UNAUTHENTICATED', 'The email or secret is wrong.', 'ای میل یا خفیہ نمبر غلط ہے۔')
  addAudit({ id: u.id, role: u.role }, 'auth.login', 'users', u.id, { result: 'ok' })
  persist()
  return ok({ access_token: 'mock.' + u.id, expires_in: 3600, user: { id: u.id, role: u.role, name: u.name, language: u.language, office: u.office ?? null } })
})
route('GET', '/me', ({ user }) => ok({ id: user!.id, role: user!.role, name: user!.name, language: user!.language, office: user!.office ?? null }))
route('GET', '/healthz', () => ok({ status: 'ok', mode: 'mock' }))

// cases
route('POST', '/cases', ({ user, body }) => {
  let pid = user!.person_id
  if (user!.role === 'helper') {
    pid = body.person_id
    if (!pid || mem.helperActive !== pid) return fail(403, 'FORBIDDEN', 'Start a helper session for this family first.', 'پہلے اس خاندان کے لیے مددگار سیشن شروع کریں۔')
    if (!mem.consents.some((c) => c.person_id === pid && c.grantee_type === 'office' && c.status === 'granted')) return fail(403, 'CONSENT_REQUIRED', 'This family has not given permission yet.', 'اس خاندان نے ابھی اجازت نہیں دی۔')
  }
  if (!pid) return fail(422, 'VALIDATION', 'No person for this account.')
  const existing = Object.values(mem.cases).find((c) => c.person?.id === pid && ['draft', 'awaiting_proof'].includes(c.status))
  if (existing) return ok(publicCase(existing), 200)
  const done = Object.values(mem.cases).find((c) => c.person?.id === pid && c.owner_user_id === (user!.role === 'citizen' ? user!.id : c.owner_user_id) && !['draft', 'closed'].includes(c.status) && !c.id.startsWith('case-q'))
  if (done) return ok(publicCase(done), 200)
  const id = 'case-' + (mem.nextId++)
  const c = baseCase(id, person(pid), 'draft', user!.role === 'citizen' ? user!.id : 'u-' + pid)
  c.helper_user_id = user!.role === 'helper' ? user!.id : null
  c.payout_account = null
  c.payout_account_title = null
  mem.cases[id] = c
  addAudit(actor(user), 'case.created', 'cases', id, { result: 'draft' })
  persist()
  return ok(publicCase(c), 201)
}, ['citizen', 'helper'])

route('GET', '/cases/:id/documents/:doc/image', () => ok({ content_type: 'image/svg+xml', doc_type: 'cnic_front', data: btoa('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380"><rect width="600" height="380" fill="#e2eee2"/><text x="40" y="190" font-size="28" font-family="Arial">MOCK PAPER (demo mode)</text></svg>') }), ['admin', 'citizen', 'helper'])

route('POST', '/demo/reset-helper', () => ok({ families_reset: 1 }), ['helper'])

route('POST', '/demo/restart-claim', ({ user }) => {
  let n = 0
  for (const c of Object.values(mem.cases)) if (c.owner_user_id === user!.id && c.status !== 'closed') { c.status = 'closed'; n++ }
  persist()
  return ok({ closed: n })
}, ['citizen'])

route('GET', '/cases', ({ user }) => {
  let list = Object.values(mem.cases)
  if (user!.role === 'citizen') list = list.filter((c) => c.owner_user_id === user!.id)
  else if (user!.role === 'helper') list = list.filter((c) => c.helper_user_id === user!.id)
  return ok(list.map(publicCase).sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? '')))
})
route('GET', '/cases/:id', ({ user, params }) => {
  const c = mem.cases[params[0]]
  if (!c) return fail(404, 'NOT_FOUND', 'We could not find this case.', 'یہ کیس نہیں ملا۔')
  if (user!.role === 'citizen' && c.owner_user_id !== user!.id) return FORBIDDEN()
  if (user!.role === 'helper' && c.helper_user_id !== user!.id) return FORBIDDEN()
  if (user!.role === 'admin') mem.accessLog.push({ id: 'a' + mem.nextId++, at: iso(), who: user!.name, role: 'officer', what: 'Name, household', purpose: 'Review of the case' })
  return ok(publicCase(c))
})

route('PUT', '/cases/:id/draft', ({ user, params, body }) => {
  const c = mem.cases[params[0]]
  if (!c) return fail(404, 'NOT_FOUND', 'We could not find this case.')
  if (user!.role === 'citizen' && c.owner_user_id !== user!.id) return FORBIDDEN()
  c.step = Math.max(1, Number(body.step) || 1)
  c.draft = body.draft ?? {}
  c.resume_code ??= mkCode(c.id)
  c.updated_at = iso()
  const d = c.draft as Record<string, unknown>
  if (typeof d.payout_account === 'string') { c.payout_account = d.payout_account; c.payout_account_title = (d.payout_title as string) ?? c.payout_account_title }
  persist()
  return ok({ saved_at: c.updated_at, resume_code: c.resume_code })
}, ['citizen', 'helper'])

route('GET', '/drafts/resume/:code', ({ params }) => {
  const c = Object.values(mem.cases).find((x) => x.resume_code === params[0])
  if (!c) return fail(404, 'NOT_FOUND', 'This code was not found. Check the numbers.', 'یہ کوڈ نہیں ملا۔ نمبر دوبارہ دیکھیں۔')
  return ok({ case_id: c.id, step: c.step, draft: c.draft ?? {}, status: c.status })
})

route('POST', '/cases/:id/documents', ({ user, params, req }) => {
  const c = mem.cases[params[0]]
  if (!c) return fail(404, 'NOT_FOUND', 'We could not find this case.')
  const form = req.form
  const file = form?.get('file') as File | null
  const docType = ((form?.get('doc_type') as string) || 'other') as DocType
  const p = person(c.person!.id)
  const nameBlur = !!file && /blur/i.test(file.name ?? '')
  const blurry = nameBlur || (p.scenario === 'ask' && c.uploads === 0)
  c.uploads++
  const signals = { blur_score: blurry ? 0.82 : 0.14, is_blurry: blurry, qr: { found: false, payload: null, valid: null }, cnic_numbers: docType.startsWith('cnic') ? [p.cnic] : [], duplicate_of: null, edit_signs: [], confidence: blurry ? 0.35 : 0.9 }
  const verdict = blurry ? 'ask_better_photo' : 'ok'
  c.documents = (c.documents ?? []).filter((d) => d.doc_type !== docType)
  c.documents.push({ id: 'd-' + mem.nextId++, doc_type: docType, verdict, signals, uploaded_at: iso() })
  c.updated_at = iso()
  addAudit(actor(user), 'document.uploaded', 'documents', c.id, { result: verdict })
  persist()
  return ok({ signals, verdict }, 201)
}, ['citizen', 'helper'])

route('POST', '/cases/:id/submit', ({ user, params }) => {
  const c = mem.cases[params[0]]
  if (!c) return fail(404, 'NOT_FOUND', 'We could not find this case.')
  const p = person(c.person!.id)
  const d = makeDecision(c, p, c.documents ?? [])
  c.decisions.unshift(d)
  c.zone = d.zone
  c.result = d.result
  c.status = d.zone === 'AUTO' ? 'approved' : d.zone === 'ASK_MORE' ? 'awaiting_proof' : 'in_review'
  c.consent_status = mem.consents.some((x) => x.person_id === p.id && x.grantee_type === 'office' && x.status === 'granted') ? 'granted' : 'withdrawn'
  c.priority = Math.round((c.amount / 1000) * (1 - d.confidence + 0.5) * 10) / 10
  if (d.zone === 'HUMAN') c.note_pkg = notesFor(d, p)
  c.updated_at = iso()
  addAudit({ id: user!.id, role: user!.role }, 'case.submitted', 'cases', c.id, { result: d.result, rule_version: d.rule_version, model_version: d.model_version, confidence: d.confidence, details: { reason_code: d.reason_code, trace: d.trace } })
  persist()
  return ok(d)
}, ['citizen', 'helper'])

route('POST', '/cases/:id/decide', ({ user, params }) => {
  const c = mem.cases[params[0]]
  if (!c) return fail(404, 'NOT_FOUND', 'We could not find this case.')
  const d = makeDecision(c, person(c.person!.id), c.documents ?? [])
  c.decisions.unshift(d)
  addAudit(actor(user), 'decision.rerun', 'decisions', d.decision_id, { result: d.result, rule_version: d.rule_version, confidence: d.confidence })
  persist()
  return ok(d)
}, ['admin'])

route('GET', '/cases/:id/decisions', ({ params }) => {
  const c = mem.cases[params[0]]
  return c ? ok(c.decisions) : fail(404, 'NOT_FOUND', 'We could not find this case.')
})
route('GET', '/cases/:id/notes', ({ params }) => {
  const c = mem.cases[params[0]]
  if (!c || !c.note_pkg) return fail(404, 'NOT_FOUND', 'There are no notes for this case.')
  return ok({ id: 'notes-' + c.id, case_id: c.id, decision_id: c.decisions[0]?.decision_id, created_at: c.updated_at, package: c.note_pkg })
}, ['admin'])

route('GET', '/queue', ({ user }) => {
  const items = Object.values(mem.cases)
    .filter((c) => c.zone === 'HUMAN' && ['in_review', 'submitted'].includes(c.status))
    .map((c) => {
      const d = c.decisions[0]
      return {
        id: c.id, status: c.status, zone: 'HUMAN' as Zone, result: d?.result, reason_code: d?.reason_code ?? 'R_LOW_CONFIDENCE', confidence: d?.confidence ?? 0.5,
        priority: c.priority ?? 1, amount: c.amount, quarter: c.quarter, person_name: c.person?.name_roman, person_name_ur: c.person?.name_ur, office: c.office,
        created_at: c.created_at ?? iso(), consent_status: c.consent_status, needs_second_approver: publicCase(c).needs_second_approver,
      }
    })
    
    .sort((a, b) => b.priority - a.priority || a.confidence - b.confidence)
  return ok(items)
}, ['admin'])

route('POST', '/cases/:id/officer-decision', ({ user, params, body }) => {
  const c = mem.cases[params[0]]
  if (!c) return fail(404, 'NOT_FOUND', 'We could not find this case.')
  if (c.owner_user_id === user!.id || c.helper_user_id === user!.id) return FORBIDDEN()
  if (c.consent_status === 'withdrawn' || !mem.consents.some((x) => x.person_id === c.person!.id && x.grantee_type === 'office' && x.status === 'granted')) {
    return fail(403, 'CONSENT_REQUIRED', 'This person took back their permission. You cannot decide this case.', 'اس شخص نے اجازت واپس لے لی ہے۔')
  }
  const dec = String(body.decision)
  if (!['approve', 'reject', 'ask_more', 'hold'].includes(dec)) return fail(422, 'VALIDATION', 'Choose approve, reject, ask_more or hold.')
  if ((dec === 'reject' || dec === 'hold') && !String(body.note ?? '').trim()) return fail(422, 'VALIDATION', 'Please write a short note for this choice.')
  const over = c.amount > activeSet().params.second_approver_over
  c.approvals ??= []
  let message = ''
  if (dec === 'approve') {
    if (c.approvals.includes(user!.id)) return fail(409, 'CONFLICT', 'You already approved this. A different admin must approve it as well.')
    c.approvals.push(user!.id)
    if (over && c.approvals.length < 2) message = 'First approval saved. A second admin must approve because the amount is above the limit.'
    else { c.status = 'approved'; message = 'Approved.' }
  } else if (dec === 'reject') { c.status = 'rejected'; message = 'Rejected. The person will be told.' }
  else if (dec === 'ask_more') { c.status = 'awaiting_proof'; message = 'We asked the person for more proof.' }
  else { c.held = true; message = 'Put on hold.' }
  const d: DecisionCard = {
    ...c.decisions[0], decision_id: 'dec-' + mem.nextId++, created_at: iso(), actor_type: 'user',
    zone: 'HUMAN', result: dec === 'approve' ? 'APPROVE' : dec === 'reject' ? 'REJECT' : dec === 'ask_more' ? 'ASK_PROOF' : 'HOLD',
    trace: [...(c.decisions[0]?.trace ?? []), { step: 99, what: 'officer', decision: dec, note: body.note ?? '' }],
  }
  c.decisions.unshift(d)
  c.updated_at = iso()
  addAudit(actor(user), 'officer.decision', 'decisions', d.decision_id, { result: d.result, rule_version: d.rule_version, details: { note: body.note ?? '', decision: dec } })
  persist()
  return ok({ case_id: c.id, status: c.status, needs_second_approver: over && c.approvals.length < 2 && dec === 'approve', decision: d, message })
}, ['admin'])

// consents
route('GET', '/consents', ({ user, req }) => {
  let pid = user!.person_id
  if (user!.role === 'helper') pid = req.query?.person_id as string | undefined
  return ok(mem.consents.filter((c) => c.person_id === pid))
}, ['citizen', 'helper'])
route('POST', '/consents', ({ user, body }) => {
  const pid = user!.role === 'helper' ? body.person_id : user!.person_id
  if (!pid) return fail(422, 'VALIDATION', 'Which person is this for?')
  // taking a fresh consent replaces a withdrawn one of the same kind
  const c: Consent = { id: 'c-' + mem.nextId++, person_id: pid, grantee_type: body.grantee_type ?? 'office', grantee_name: body.grantee_type === 'service' ? 'Payment check (mock)' : 'Office KHI-EAST', purpose: body.purpose ?? 'claim', fields: body.fields ?? [], status: 'granted', granted_at: iso(), withdrawn_at: null, version: 1 }
  mem.consents.push(c)
  Object.values(mem.cases).forEach((x) => { if (x.person?.id === pid) x.consent_status = 'granted' })
  addAudit(actor(user), 'consent.granted', 'consents', c.id, { result: 'granted' })
  persist()
  return ok(c, 201)
}, ['citizen', 'helper'])
route('POST', '/consents/:id/withdraw', ({ user, params }) => {
  const c = mem.consents.find((x) => x.id === params[0])
  if (!c) return fail(404, 'NOT_FOUND', 'We could not find this permission.')
  c.status = 'withdrawn'
  c.withdrawn_at = iso()
  if (c.grantee_type === 'office') Object.values(mem.cases).forEach((x) => { if (x.person?.id === c.person_id) x.consent_status = 'withdrawn' })
  addAudit(actor(user), 'consent.withdrawn', 'consents', c.id, { result: 'withdrawn' })
  persist()
  return ok(c)
}, ['citizen', 'helper'])
route('GET', '/data-access-log', () => ok(mem.accessLog.slice().reverse()), ['citizen', 'helper'])

// helper
route('GET', '/helper/families', () => ok(
  PEOPLE.filter((p) => ['p-rukhsana', 'p-mumtaz', 'p-kausar', 'p-nasreen', 'p-farida', 'p-shamim'].includes(p.id)).map((p) => {
    const cs = mem.consents.filter((c) => c.person_id === p.id && c.grantee_type === 'office')
    const cs1 = cs.find((c) => c.status === 'granted') ?? cs[cs.length - 1]
    const cc = Object.values(mem.cases).find((c) => c.person?.id === p.id)
    return { person_id: p.id, name_roman: p.name, name_ur: p.name_ur, cnic_last4: p.cnic.slice(-4), district: p.district, consent_status: cs1?.status ?? 'none', case_status: cc?.status ?? null, case_id: cc?.id ?? null }
  }),
), ['helper'])
route('POST', '/helper/session', ({ user, body }) => {
  mem.helperActive = body.person_id ?? null
  addAudit(actor(user), body.person_id ? 'helper.session_started' : 'helper.session_ended', 'helper_assignments', body.person_id ?? null, { result: 'ok' })
  persist()
  const p = body.person_id ? person(body.person_id) : null
  return ok({ person_id: mem.helperActive, active: !!mem.helperActive, started_at: mem.helperActive ? iso() : null, person: p ? { id: p.id, name_roman: p.name, name_ur: p.name_ur } : undefined })
}, ['helper'])

// checks
route('POST', '/cases/:id/household-check', ({ body, user }) => {
  const own = PEOPLE.find((x) => x.id === user?.person_id)
  const good = !!own && own.members === Number(body.members)
  return ok({ match: good, locked: false, tries_left: good ? 3 : 2 })
}, ['citizen', 'helper'])

route('POST', '/helper/verify-family', ({ body }) => {
  const rec = PEOPLE.find((x) => x.cnic === String(body.cnic ?? '').replace(/\D/g, ''))
  if (!rec || rec.members !== Number(body.members)) return fail(403, 'FORBIDDEN', 'These details do not match. Please check them with her.', 'یہ تفصیل نہیں ملتی۔ براہ کرم ان سے دوبارہ پوچھیں۔')
  return ok({ ok: true, person_id: rec.id })
}, ['helper'])

route('POST', '/cases/:id/identity-lookup', ({ body, user }) => {
  const digits = String(body.cnic ?? '').replace(/\D/g, '')
  const rec = PEOPLE.find((x) => x.cnic === digits)
  const own = PEOPLE.find((x) => x.id === user?.person_id)
  if (!rec) return ok({ found: false, same_person: false, record: null })
  if (!own || rec.id !== own.id) return ok({ found: true, same_person: false, record: { name_roman: rec.name, name_ur: rec.name_ur } })
  return ok({ found: true, same_person: true, record: { name_roman: rec.name, name_ur: rec.name_ur, father_or_husband: rec.father, dob: '1978-01-01', gender: 'F', district: rec.district, cnic_masked: rec.cnic.slice(0, 5) + '-*******-' + rec.cnic.slice(-1) } })
}, ['citizen', 'helper'])

route('POST', '/identity/match', ({ body }) => {
  const norm = (s?: string) => (s ?? '').toLowerCase().replace(/\b(muhammad|mohammad|muhammed|mohd|mohamed)\b/g, 'muhammad').replace(/[^a-z ]/g, '').trim()
  const a = body.a ?? {}, b = body.b ?? {}
  const cnicSame = !!a.cnic && a.cnic === b.cnic
  const nameSame = norm(a.name) && norm(a.name) === norm(b.name)
  const band = cnicSame ? 'SAME' : a.cnic && b.cnic ? 'DIFFERENT' : nameSame ? 'MAYBE' : 'DIFFERENT'
  return ok({
    band, score: band === 'SAME' ? 0.97 : band === 'MAYBE' ? 0.62 : 0.1,
    evidence: [{ field: 'cnic', a: a.cnic ?? null, b: b.cnic ?? null, agree: cnicSame ? 'yes' : a.cnic && b.cnic ? 'no' : 'missing', weight: 0.6 }, { field: 'name', a: a.name ?? null, b: b.name ?? null, agree: nameSame ? 'yes' : 'no', weight: 0.4 }],
    reason_code: band === 'MAYBE' ? 'R_NAME_AMBIGUOUS' : null,
  })
})
route('POST', '/mock/raast/verify', ({ body }) => {
  const acc = String(body.account ?? '').replace(/\D/g, '')
  if (!/^03\d{9}$/.test(acc)) return ok({ valid: false, title: null })
  return ok({ valid: true, title: null, shared_with_other_households: acc === '03007770003' })
})

route('POST', '/scam/check', ({ body }) => {
  mem.scamCount++
  const text = String(body.text ?? '')
  const sender = String(body.sender ?? '').trim()
  const codes: string[] = []
  if (/(fee|charges?|processing|فیس|ٹیکس|rs\.? ?\d|روپے|deposit|pay\b)/i.test(text) && /(send|pay|deposit|bhej|بھیج|جمع)/i.test(text)) codes.push('ASKS_FEE')
  if (/(pin|otp|password|پن|پاس ورڈ)/i.test(text)) codes.push('ASKS_PIN_OR_OTP')
  if (/(cnic|id card|شناختی)/i.test(text) && /(send|share|reply|بھیج)/i.test(text)) codes.push('ASKS_CNIC')
  if (/(urgent|immediately|right now|today only|24 hours|فوراً|فوری)/i.test(text)) codes.push('URGENT_LANGUAGE')
  if (/https?:\/\/(?!sahara\.gov\.test)\S+|bit\.ly|tinyurl/i.test(text)) codes.push('SUSPICIOUS_LINK')
  if (/(won|prize|lottery|reward|انعام|لاٹری|congratulations)/i.test(text)) codes.push('PRIZE_TOO_GOOD')
  const official = sender === '9171'
  if (!official && sender) codes.push('SENDER_NOT_OFFICIAL')
  if (official && codes.length === 0) codes.push('OFFICIAL_SENDER')
  const bad = codes.filter((c) => c !== 'OFFICIAL_SENDER' && c !== 'SENDER_NOT_OFFICIAL').length
  const label = bad >= 2 || codes.includes('ASKS_PIN_OR_OTP') || codes.includes('ASKS_FEE') ? 'scam' : bad === 1 || codes.includes('SENDER_NOT_OFFICIAL') ? 'suspicious' : 'safe'
  const advice = {
    safe: { en: 'This looks fine. Still, never share your PIN with anyone.', ur: 'یہ ٹھیک لگتا ہے۔ پھر بھی اپنا پن کسی کو نہ بتائیں۔' },
    suspicious: { en: 'Be careful. Do not click links or reply. Ask your helper or visit the office.', ur: 'احتیاط کریں۔ لنک نہ کھولیں اور جواب نہ دیں۔ اپنے مددگار سے پوچھیں یا دفتر جائیں۔' },
    scam: { en: 'This looks like a scam. Do not pay, do not share your PIN. Show it to a helper.', ur: 'یہ فراڈ لگتا ہے۔ پیسے نہ دیں، پن نہ بتائیں۔ مددگار کو دکھائیں۔' },
  }[label]
  const res: ScamResult = { label, score: label === 'scam' ? 0.93 : label === 'suspicious' ? 0.55 : 0.05, reasons: codes.map((code) => ({ code, en: S[code].en, ur: S[code].ur })), advice }
  persist()
  return ok(res)
})
route('POST', '/scam/report', () => ok({ ok: true }, 201))

// audit
route('GET', '/audit', ({ req }) => {
  let items = mem.audit.slice().reverse()
  const q = req.query ?? {}
  if (q.action) items = items.filter((e) => e.action.includes(String(q.action)))
  if (q.entity_type) items = items.filter((e) => e.entity_type === q.entity_type)
  if (q.actor_id) items = items.filter((e) => e.actor_id === q.actor_id)
  const limit = Number(q.limit) || 200
  return ok({ items: items.slice(0, limit), total: items.length })
}, ['admin'])
route('GET', '/audit/mine', ({ user }) => ok({ items: mem.audit.filter((e) => e.actor_id === user!.id).reverse().slice(0, 100) }))
route('GET', '/audit/verify', () => {
  let prev = '0'.repeat(64)
  for (const e of mem.audit) {
    if (e.prev_hash !== prev || e.hash !== hashText(prev + rowText(e))) return ok({ intact: false, broken_at: e.id, checked: mem.audit.length })
    prev = e.hash!
  }
  return ok({ intact: true, broken_at: null, checked: mem.audit.length })
}, ['admin'])

// rules
route('GET', '/rule-sets', () => ok(mem.ruleSets.map(({ rules, ...r }) => ({ ...r, rule_count: rules.length })).sort((a, b) => b.version - a.version)), ['admin'])
route('GET', '/rule-sets/:id', ({ params }) => {
  const r = mem.ruleSets.find((x) => x.id === params[0])
  return r ? ok(r) : fail(404, 'NOT_FOUND', 'We could not find this rule version.')
}, ['admin'])

route('POST', '/rules/validate', ({ body }) => {
  const errors = body.expression !== undefined ? validateExpression(body.expression) : validateSet(body.params, body.rules)
  return ok({ ok: errors.length === 0, errors })
}, ['admin'])
route('POST', '/rule-sets', ({ user, body }) => {
  const errors = validateSet(body.params, body.rules)
  if (errors.length) return { status: 422, json: { error: { code: 'VALIDATION', message: errors[0].message, message_ur: errors[0].message, details: errors, request_id: 'mock' } } }
  const parent = mem.ruleSets.find((r) => r.id === body.parent_id)
  const version = Math.max(...mem.ruleSets.map((r) => r.version)) + 1
  const rs = { id: 'rs-' + version, version, status: 'draft' as const, params: body.params, checksum: 'sha256-' + hashText(JSON.stringify(body)).slice(0, 24), parent_version: parent?.version ?? null, created_by: user!.id, created_at: iso(), effective_from: null, effective_to: null, rules: withText(body.rules) }
  mem.ruleSets.push(rs)
  addAudit(actor(user), 'rule_set.created', 'rule_sets', rs.id, { rule_version: version, result: 'ok' })
  persist()
  return ok(rs, 201)
}, ['admin'])
route('POST', '/rules/activate', ({ user, body }) => {
  const rs = mem.ruleSets.find((r) => r.id === body.rule_set_id)
  if (!rs) return fail(404, 'NOT_FOUND', 'We could not find this rule version.')
  if (rs.status !== 'draft') return fail(409, 'CONFLICT', 'Only a draft can be activated.')
  const now = iso()
  const old = activeSet()
  old.status = 'retired'; old.effective_to = now
  rs.status = 'active'; rs.effective_from = now
  addAudit(actor(user), 'rule_set.activated', 'rule_sets', rs.id, { rule_version: rs.version, result: 'ok' })
  persist()
  return ok(rs)
}, ['admin'])

/** The pretend past cases for the Digital Twin: 120 scores, the same every time. */
function pastScores(n: number) {
  let s = 7
  return Array.from({ length: n }, (_, i) => { s = (s * 1103515245 + 12345) % 2147483648; return { id: 'hist-' + (1000 + i), pmt: 5 + (s % 4500) / 100, name: 'Case ' + (1000 + i) } })
}
const zoneFor = (pmt: number, pr: RuleParams): { zone: Zone; reason_code: string } =>
  pmt <= pr.cutoff - pr.borderline_band ? { zone: 'AUTO', reason_code: 'R_AUTO_APPROVED' } : pmt <= pr.cutoff ? { zone: 'HUMAN', reason_code: 'R_PMT_BORDERLINE' } : { zone: 'HUMAN', reason_code: 'R_PMT_ABOVE_CUTOFF' }
route('POST', '/rules/twin', ({ body }) => {
  const rs = mem.ruleSets.find((r) => r.id === body.rule_set_id)
  if (!rs) return fail(404, 'NOT_FOUND', 'We could not find this rule version.')
  const base = activeSet().params
  const rows = pastScores(Math.min(Number(body.limit) || 120, 120))
  const moves: Record<string, number> = {}
  const examples: any[] = [] // eslint-disable-line @typescript-eslint/no-explicit-any
  let approvalsChanged = 0, before = 0, after = 0
  const cost = (z: Zone, p: RuleParams) => (z === 'AUTO' ? p.costs.wrong_approve * 0.02 : p.costs.review)
  for (const r of rows) {
    const b = zoneFor(r.pmt, base), a = zoneFor(r.pmt, rs.params)
    before += cost(b.zone, base); after += cost(a.zone, rs.params)
    if (b.zone !== a.zone) {
      const k = `${b.zone}->${a.zone}`
      moves[k] = (moves[k] ?? 0) + 1
      if (b.zone === 'AUTO' || a.zone === 'AUTO') approvalsChanged++
      if (examples.length < 6) examples.push({ case_id: r.id, name: `${r.name} (score ${r.pmt.toFixed(1)})`, before: { zone: b.zone, result: b.zone === 'AUTO' ? 'APPROVE' : 'HUMAN_REVIEW', reason_code: b.reason_code }, after: { zone: a.zone, result: a.zone === 'AUTO' ? 'APPROVE' : 'HUMAN_REVIEW', reason_code: a.reason_code } })
    }
  }
  return ok({ cases: rows.length, changed: Object.values(moves).reduce((x, y) => x + y, 0), moves, approvals_changed: approvalsChanged, cost_before: Math.round(before), cost_after: Math.round(after), examples })
}, ['admin'])

route('GET', '/policy/cost-curve', ({ req }) => {
  const q = req.query ?? {}
  const wa = Number(q.wrong_approve) || 100, wr = Number(q.wrong_reject) || 20, rv = Number(q.review) || 3
  // a fixed pretend population of 400 labelled cases: p = model score, truth = really eligible or not
  let s = 11
  const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 }
  const pop = Array.from({ length: 400 }, () => { const eligible = rnd() < 0.7; const p = eligible ? 0.55 + 0.45 * Math.pow(rnd(), 0.6) : 0.05 + 0.75 * Math.pow(rnd(), 1.4); return { p, eligible } })
  const points: { approve_line: number; expected_cost: number }[] = []
  for (let t = 0.5; t <= 0.9951; t += 0.01) {
    let c = 0
    for (const x of pop) c += x.p >= t ? (x.eligible ? 0 : wa) : rv + (x.eligible ? 0 : 0) * wr
    points.push({ approve_line: Math.round(t * 100) / 100, expected_cost: Math.round((c / pop.length) * 100) / 100 })
  }
  const min = points.reduce((m, p) => (p.expected_cost < m.expected_cost ? p : m))
  const cur = 1 - rv / wa
  const near = points.reduce((m, p) => (Math.abs(p.approve_line - cur) < Math.abs(m.approve_line - cur) ? p : m))
  return ok({ points, min, current: { approve_line: Math.round(cur * 100) / 100, expected_cost: near.expected_cost }, costs: { wrong_approve: wa, wrong_reject: wr, review: rv } })
}, ['admin'])

route('GET', '/eval/latest', () => ok({
  run_id: 'eval-mock-1', created_at: hoursAgo(26), n: 120, accuracy: 0.9, auto_rate: 0.38, human_rate: 0.46, cost: 412,
  confusion: { labels: ['AUTO', 'ASK_MORE', 'HUMAN'], matrix: [[40, 1, 3], [0, 22, 3], [1, 3, 47]] },
  false_alarms: [
    { case: 'Case 1042 (score 23.9)', truth: 'AUTO', predicted: 'HUMAN', zone: 'HUMAN', note: 'name spelled three ways' },
    { case: 'Case 1067 (score 27.1)', truth: 'AUTO', predicted: 'HUMAN', zone: 'HUMAN', note: 'close to the cutoff' },
    { case: 'Case 1090 (score 19.4)', truth: 'ASK_MORE', predicted: 'HUMAN', zone: 'HUMAN', note: 'blur reading was unsure' },
    { case: 'Case 1113 (score 31.2)', truth: 'HUMAN', predicted: 'AUTO', zone: 'AUTO', note: 'WRONG APPROVE. This is the costly kind.' },
  ],
  speed: { p50_ms: 38, p95_ms: 112, per_case_ms: 52 }, notes: 'MOCK numbers. The live page shows the real evaluation run.',
}), ['admin'])
route('GET', '/analytics/summary', () => {
  const cs = Object.values(mem.cases)
  const by_zone: Record<string, number> = { AUTO: 38, ASK_MORE: 21, HUMAN: 51 }
  cs.forEach((c) => { if (c.zone) by_zone[c.zone]++ })
  return ok({ cases_total: 110 + cs.length, by_zone, queue_open: cs.filter((c) => c.zone === 'HUMAN' && c.status === 'in_review').length, avg_decision_ms: 52, override_rate: 0.08, scam_checked: 64 + mem.scamCount, by_status: { approved: 38, in_review: 51, awaiting_proof: 21 } })
}, ['admin'])

// ---------------------------------------------------------------- transport
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function userFromToken(token: string | null) {
  if (!token?.startsWith('mock.')) return null
  return USERS.find((u) => 'mock.' + u.id === token) ?? null
}

export const mockTransport: Transport = async (req, token) => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new NetworkError('offline')
  if (delay) await sleep(delay)
  mem ??= load()
  const path = req.path
  const pub = path === '/auth/login' || path === '/healthz' || path.startsWith('/drafts/resume/')
  const user = userFromToken(token)
  if (!pub && !user) return fail(401, 'UNAUTHENTICATED', 'Please log in again.', 'براہ کرم دوبارہ لاگ ان کریں۔')

  // idempotency: the same key on the same call returns the first answer
  const key = req.headers?.['Idempotency-Key']
  const ikey = key ? `${req.method} ${path} ${key}` : null
  if (ikey && mem.idem[ikey]) return mem.idem[ikey]

  for (const r of routes) {
    if (r.method !== req.method) continue
    const m = r.re.exec(path)
    if (!m) continue
    if (r.roles && user && !r.roles.includes(user.role)) return FORBIDDEN()
    const body = (req.body ?? {}) as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
    const res = await r.h({ user, req, params: m.slice(1), body })
    if (ikey && res.status < 300) { mem.idem[ikey] = res; persist() }
    return res
  }
  return fail(404, 'NOT_FOUND', 'This address does not exist.')
}

/** Used by tests and the dev console to check that the diary check can fail. */
export function tamperAudit(row = 3) {
  mem ??= load()
  if (mem.audit[row - 1]) { mem.audit[row - 1].result = 'tampered'; persist() }
}
if (typeof window !== 'undefined') (window as unknown as { __sahara?: object }).__sahara = { tamperAudit, resetMock }
