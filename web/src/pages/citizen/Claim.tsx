// The claim flow: 8 small steps, one question each. Every step is saved (phone + service) before we move on.
// Used by the citizen (/claim) and by the helper for one family (/helper/claim).
import { useCallback, useEffect, useRef, useState } from 'react'
import { api, errorText, newKey, NetworkError } from '../../api'
import type { CaseDetail, DecisionCard, DocType, IdentityLookup } from '../../api/types'
import { Btn, Notice, Spinner, ErrorBox, money } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { NumberPad, formatCnic } from '../../components/NumberPad'
import { useLang } from '../../i18n'
import { useAuth } from '../../auth/AuthContext'
import { navigate, currentQuery, usePath } from '../../router'
import { loadCaseSnap, loadLocalDraft, saveCaseSnap, saveProgress, submitClaim, useOnline, useOutbox } from '../../offline/runtime'
import { Hero, StepFrame, ProgressDots, type SaveState } from './claim/StepFrame'
import { DocsStep, type DocsDraft } from './claim/DocsStep'
import { ResultCard } from './claim/ResultCard'
import { staffMessage } from './claim/staffMessage'
import { reasonText } from '../../data/reasons'
import { SpeakButton } from '../../components/SpeakButton'

type Draft = Record<string, unknown> & {
  consent?: boolean
  identity?: 'confirmed' | 'not_me' | 'maybe'
  household?: 'confirmed' | 'not_me'
  docs?: DocsDraft
  payout_account?: string
  payout_title?: string
  payout_ok?: boolean
  ask_helper?: boolean
  submit_key?: string
  submitted?: boolean
}

// papers asked for: the ID card, front and back. Nothing else (many rural women have no income letter or bill).
const DOCS: DocType[] = ['cnic_front', 'cnic_back']

export default function Claim({ params }: { params: Record<string, string> }) {
  const helper = usePath().startsWith('/helper')
  if (!params.id) return helper ? <GoFamilies /> : <Start />
  return <Flow caseId={params.id} step={Math.min(8, Math.max(1, Number(params.step) || 1))} helper={helper} />
}

function GoFamilies() {
  useEffect(() => navigate('/helper', true), [])
  return <Spinner />
}

// ------------------------------------------------------------------ step 1 (before a case exists)
function Start() {
  const { t, lang } = useLang()
  const { family } = useAuth()
  const online = useOnline()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const existing = useRef<CaseDetail | undefined>(undefined)
  const [loaded, setLoaded] = useState(false)
  const [, force] = useState(0)

  useEffect(() => {
    // while a claim is with staff the page keeps itself up to date (a request, the money sent, ...)
    let alive = true
    const load = () => api.listCases().then((cs) => {
      if (!alive) return
      existing.current = cs.find((c) => c.status !== 'closed'); setLoaded(true); force((x) => x + 1)
      const open = existing.current
      if (open?.status === 'awaiting_proof') {
        api.decisions(open.id).then((d) => alive && setAsked(d[0] ?? null)).catch(() => {})
        // keep a copy of the claim on the phone, so "Send it now" still opens when the signal drops
        api.getCase(open.id).then((full) => saveCaseSnap(full)).catch(() => {})
      }
      else setAsked(null)
    }).catch(() => alive && setLoaded(true))
    void load()
    const timer = setInterval(() => { if (!document.hidden) void load() }, 10000)
    return () => { alive = false; clearInterval(timer) }
  }, [])
  const [asked, setAsked] = useState<DecisionCard | null>(null)

  const go = async () => {
    setBusy(true); setError('')
    try {
      const c = await api.createCase()
      await saveCaseSnap(c)
      navigate(`/claim/${c.id}/2`)
    } catch (e) {
      setError(e instanceof NetworkError ? t('claim.needSignalStart') : errorText(e, lang))
    } finally { setBusy(false) }
  }
  const ex = existing.current
  if (!loaded) return <Spinner />
  const sent = ex && ex.status !== 'draft'
  if (sent && ex) {
    // after sending, only the news about her claim is shown (no welcome, no language choice, no progress bar)
    const askedNow = asked && asked.zone === 'ASK_MORE'
    const paid = ex.status === 'approved' || ex.status === 'paid'
    return (
      <div className="space-y-5" data-testid="claim-status">
        {!family && <Hero />}
        {askedNow ? (
          <div className="space-y-3">
            <Notice tone="ask" icon="warning">
              <b data-testid="asked-title">{t('result.ASK_MORE.title')}</b>
              <span className="mt-1 block">{staffMessage(asked, lang, t).text}</span>
              <SpeakButton className="mt-2" promptKey={staffMessage(asked, lang, t).key} text={staffMessage(asked, lang, t).text} />
              <span className="mt-1 block font-semibold">{t('result.ASK_MORE.need')}: {asked.next_step?.doc_type === 'cnic_both' ? `${t('doc.cnic_front')} + ${t('doc.cnic_back')}` : asked.next_step?.doc_type ? t(`doc.${asked.next_step.doc_type}`) : t('doc.other')}</span>
            </Notice>
            <Btn block icon="camera" onClick={() => navigate(asked.next_step?.doc_type && asked.next_step.doc_type !== 'other' ? `/claim/${ex.id}/5?${asked.next_step.doc_type !== 'cnic_both' ? `doc=${asked.next_step.doc_type}&` : ''}redo=1` : `/claim/${ex.id}/8`)}>{t('result.ASK_MORE.send')}</Btn>
          </div>
        ) : paid ? (
          <Notice tone="auto" icon="check">
            <b data-testid="paid-notice">{t('claim.paid', { amount: money(ex.amount) })}</b>
            <SpeakButton className="mt-2" promptKey="paid_call" text={t('prompt.paid_call')} />
          </Notice>
        ) : (
          <Notice tone="human" icon="clock">
            <b data-testid="verifying-notice">{t('claim.verifying')}</b>
            <SpeakButton className="mt-2" promptKey="verifying" text={t('prompt.verifying')} />
          </Notice>
        )}
        <p className="text-center text-sm text-muted"><button type="button" className="underline" onClick={() => navigate(`/claim/${ex.id}/8`)}>{t('claim.seeAnswer')}</button></p>
      </div>
    )
  }
  return (
    <StepFrame step={1} title={t('step.1.title')} prompt={t('prompt.step_1')} save="idle" onNext={go} nextLabel={ex ? t('claim.continue') : t('claim.yes')} busy={busy}>
      <Welcome />
      {!online && <Notice className="mt-4" tone="ask" icon="wifioff">{t('claim.needSignalStart')}</Notice>}
      {error && <Notice className="mt-4" tone="danger" icon="warning">{error}</Notice>}
    </StepFrame>
  )
}

function Welcome() {
  const { t, lang, setLang } = useLang()
  return (
    <div className="space-y-4">
      <p className="text-lg">{t('step.1.body')}</p>
      <div>
        <p className="label">{t('step.1.language')}</p>
        <div className="grid grid-cols-2 gap-3">
          {(['ur', 'en'] as const).map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}
              className={`min-h-[60px] rounded-2xl border-2 text-xl font-bold transition-colors ${lang === l ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-white hover:bg-brand-soft/60'}`}>
              {l === 'ur' ? 'اردو' : 'English'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ the flow with a case
function Flow({ caseId, step, helper }: { caseId: string; step: number; helper: boolean }) {
  const { t, lang } = useLang()
  const { family } = useAuth()
  const online = useOnline()
  const base = helper ? '/helper/claim' : '/claim'
  const [c, setC] = useState<CaseDetail>()
  const [draft, setDraft] = useState<Draft>({})
  const [resume, setResume] = useState<string>()
  const [save, setSave] = useState<SaveState>('idle')
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const [loadErr, setLoadErr] = useState<unknown>(null)
  const draftRef = useRef<Draft>({})
  draftRef.current = draft

  // load: the service copy, else the copy on the phone
  useEffect(() => {
    let alive = true
    ;(async () => {
      const local = await loadLocalDraft(caseId)
      let server: CaseDetail | undefined
      try { server = await api.getCase(caseId); void saveCaseSnap(server) } catch (e) {
        server = await loadCaseSnap(caseId)
        if (!server) { if (alive) setLoadErr(e); return }
      }
      if (!alive) return
      const serverDraft = (server.draft ?? {}) as Draft
      const useLocal = local && (!server.updated_at || local.savedAt > new Date(server.updated_at).getTime())
      setC(server)
      setDraft((useLocal ? local.draft : serverDraft) as Draft)
      setResume(local?.resume_code ?? server.resume_code ?? undefined)
    })()
    return () => { alive = false }
  }, [caseId])

  const go = useCallback(async (to: number, patch: Partial<Draft> = {}) => {
    // remember the screens in the order the person saw them, so Back returns to the screen they came from
    const trail = ((draftRef.current.trail as number[] | undefined) ?? []).filter((x) => x !== to)
    const next = { ...draftRef.current, ...patch, trail: [...trail, step] }
    setDraft(next)
    setBusy(true); setError(null)
    try {
      const r = await saveProgress(caseId, to, next, resume)
      setSave(r.saved === 'server' ? 'server' : 'phone')
      if (r.saved === 'server') setResume(r.resume_code)
    } catch (e) { setError(e) }
    setBusy(false)
    navigate(`${base}/${caseId}/${to}`)
  }, [caseId, resume, base, step])

  const redoDone = useRef(false)
  const [redoReady, setRedoReady] = useState(false)
  useEffect(() => {
    if (!c || step !== 5 || redoDone.current || currentQuery().get('redo') !== '1') return
    redoDone.current = true
    const only = currentQuery().get('doc')
    const again: DocType[] = only === 'cnic_front' || only === 'cnic_back' ? [only] : DOCS
    const docsNow = { ...(draftRef.current.docs ?? {}) }
    again.forEach((d) => { delete docsNow[d] })
    const next = { ...draftRef.current, docs: docsNow, submit_key: undefined, submitted: false }
    setDraft(next); draftRef.current = next
    void saveProgress(caseId, 5, next, resume).catch(() => {})
    setRedoReady(true)
  }, [c, step]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loadErr) return <ErrorBox error={loadErr} onRetry={() => location.reload()} />
  if (!c) return <Spinner label={t('common.wait')} />

  const person = c.person
  const name = lang === 'ur' ? (person?.name_ur ?? person?.name_roman) : person?.name_roman
  const common = { resume, save, busy }
  const back = step > 1 ? () => {
    const trail = ((draftRef.current.trail as number[] | undefined) ?? []).filter((x) => x < 9)
    const prev = trail.length ? trail[trail.length - 1] : step - 1
    setDraft({ ...draftRef.current, trail: trail.slice(0, -1) })
    navigate(`${base}/${caseId}/${prev}`)
  } : undefined

  // ---- step 1 (back button reached it again)
  if (step === 1) {
    return <StepFrame step={1} title={t('step.1.title')} prompt={t('prompt.step_1')} {...common} onNext={() => go(2)} nextLabel={t('claim.yes')}><Welcome /></StepFrame>
  }

  // ---- step 2: consent
  if (step === 2 && helper) {
    // a helper never gives consent for her: it was recorded on the Families screen from her ID number, date of birth and household size
    return (
      <StepFrame step={2} title={t('step.2.title')} prompt={t('prompt.step_2')} {...common} onBack={back}>
        <div className="space-y-4">
          <Notice tone="auto" icon="check"><b>{t('helper.consent_done')}</b></Notice>
          <Notice tone="brand" icon="lock">{t('step.2.takeback')}</Notice>
          <div className="grid gap-3">
            <Btn variant="success" block icon="check" disabled={busy} onClick={() => go(5, { consent: true, identity: 'confirmed', household: 'confirmed' })}>{t('common.next')}</Btn>
            <Btn variant="secondary" block icon="x" onClick={() => navigate('/helper')}>{t('common.back')}</Btn>
          </div>
        </div>
      </StepFrame>
    )
  }
  if (step === 2) {
    return (
      <StepFrame step={2} title={t('step.2.title')} prompt={t('prompt.step_2')} {...common}>
        <div className="space-y-4">
          <ul className="space-y-2.5">
            {[['person', 'step.2.see_office'], ['people', 'step.2.see_helper'], ['bank', 'step.2.see_bank']].map(([icon, k]) => (
              <li key={k} className="flex items-center gap-3 rounded-xl bg-paper p-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-brand border border-line"><Icon name={icon as 'person'} size={24} /></span>
                <span className="text-lg">{t(k)}</span>
              </li>
            ))}
          </ul>
          <Notice tone="brand" icon="lock"><b>{t('step.2.takeback')}</b></Notice>
          {error != null && <Notice tone="danger" icon="warning">{errorText(error, lang)}</Notice>}
          <div className="grid gap-3">
            <Btn variant="success" block icon="check" disabled={busy} onClick={async () => {
              setBusy(true); setError(null)
              try {
                await api.grantConsent({ grantee_type: 'office', purpose: 'claim', fields: ['name', 'cnic', 'household', 'account'], person_id: helper ? person?.id : undefined })
                setBusy(false)
                await go(3, { consent: true })
              } catch (e) {
                setBusy(false)
                // offline: we keep the choice and the claim will not be sent until consent is stored
                if (e instanceof NetworkError) setError(e); else setError(e)
              }
            }}>{t('step.2.allow')}</Btn>
            <Btn variant="secondary" block icon="x" onClick={() => navigate(helper ? '/helper' : '/claim')}>{t('step.2.deny')}</Btn>
          </div>
        </div>
      </StepFrame>
    )
  }

  // a helper already proved her ID number, date of birth and household size on the Families screen: never ask again
  if (helper && (step === 3 || step === 4)) return <RunOnce run={() => void go(5, { identity: 'confirmed', household: 'confirmed' })} label={t('common.wait')} />

  // ---- step 3: who are you
  if (step === 3) {
    return <IdentityStep c={c} name={name ?? ''} {...common} back={back} onDone={(identity, claimed) => go(identity === 'not_me' ? 7 : 4, { identity, claimed_cnic: claimed ?? '' })} />
  }

  // ---- step 4: household. She types the number; we never show it. Three wrong tries send the claim to a person.
  if (step === 4) {
    return <HouseholdStep c={c} {...common} back={back} onDone={(ok) => go(ok ? 5 : 7, { household: ok ? 'confirmed' : 'not_me' })} />
  }

  // ---- step 5: documents
  if (step === 5) {
    const only = currentQuery().get('doc') as DocType | null
    const redo = currentQuery().get('redo') === '1'          // staff asked for this paper: take it, and it is sent by itself
    const docs = only ? [only] : DOCS
    const state = draft.docs ?? {}
    const complete = docs.every((d) => ['ok', 'queued', 'suspicious', 'skipped'].includes(state[d] ?? ''))
    const sendAgain = async () => {
      setError(null)
      try {
        const key = newKey()                                  // a NEW send needs a new key (the old one would only replay the first answer)
        const next = { ...draftRef.current, submit_key: key, submitted: true }
        setDraft(next)
        await saveProgress(caseId, 8, next, resume)
        await submitClaim(caseId, key)
        navigate(`${base}/${caseId}/8`)
      } catch (e) { setError(e) }
    }
    return (
      <StepFrame step={5} title={t('step.5.title')} prompt={t('prompt.step_5')} {...common} onBack={back}
        onNext={redo ? undefined : () => go(only ? 7 : 6, {})} nextDisabled={!complete}>
        {redo && redoReady && complete && !error && <RunOnce run={() => void sendAgain()} label={t('common.wait')} />}
        {redo && error != null && <Notice tone="danger" icon="warning">{errorText(error, lang)}</Notice>}
        <DocsStep caseId={caseId} docs={docs} state={state} onChange={(docsNext) => { setDraft((d) => ({ ...d, docs: { ...d.docs, ...docsNext } })); void saveProgress(caseId, 5, { ...draftRef.current, docs: { ...draftRef.current.docs, ...docsNext } }, resume).then((r) => setSave(r.saved === 'server' ? 'server' : 'phone')).catch(() => {}) }} />
      </StepFrame>
    )
  }

  // ---- step 6: payout account
  if (step === 6) {
    return <PayoutStep c={c} draft={draft} {...common} helper={helper} back={back} onDone={(patch) => go(7, patch)} />
  }

  // ---- step 7: look and send
  if (step === 7) {
    const docs = draft.docs ?? {}
    const sent = Object.values(docs).filter((v) => v === 'ok' || v === 'queued' || v === 'suspicious').length
    const notMe = draft.identity === 'not_me' || draft.household === 'not_me'
    const send = async () => {
      setBusy(true); setError(null)
      try {
        const key = (draft.submit_key as string | undefined) ?? newKey()
        const next = { ...draft, submit_key: key, submitted: true }
        setDraft(next)
        await saveProgress(caseId, 8, next, resume)
        await submitClaim(caseId, key)
        navigate(`${base}/${caseId}/8`)
      } catch (e) { setError(e) }
      setBusy(false)
    }
    const rows: [string, string][] = [
      ['person', name ?? ''],
      ['people', t('step.4.members', { n: c.household?.members ?? '?' })],
      ['doc', t('step.7.docs', { n: sent })],
      ['bank', (draft.payout_account || c.payout_account) ? t('step.7.account_given') : t('step.7.noaccount')],
    ]
    return (
      <StepFrame step={7} title={t('step.7.title')} prompt={t('prompt.step_7')} {...common} onBack={back} onNext={send} nextLabel={t('step.7.send')} nextVariant="success">
        <div className="space-y-3">
          <ul className="space-y-2">
            {rows.map(([icon, text]) => (
              <li key={icon} className="flex items-center gap-3 rounded-xl bg-paper p-3 text-lg">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-brand border border-line"><Icon name={icon as 'person'} size={22} /></span>
                <span className="font-semibold">{text}</span>
              </li>
            ))}
          </ul>
          {notMe && <Notice tone="human" icon="person">{t('step.7.notme')}</Notice>}
          <p className="text-center text-muted">{t('step.7.amount')}: <b className="ltr text-ink">{money(c.amount)}</b></p>
          {error != null && <Notice tone="danger" icon="warning">{errorText(error, lang)}</Notice>}
        </div>
      </StepFrame>
    )
  }

  // ---- step 8: the answer
  return <ResultStep c={c} caseId={caseId} base={base} helper={helper} online={online} resume={resume} />
}

// ------------------------------------------------------------------ step 3
// Type the ID number first -> we look it up in the government record -> show what the record says -> "Is this you?"
function IdentityStep({ c, resume, save, busy, back, onDone }: { c: CaseDetail; name: string; resume?: string; save: SaveState; busy: boolean; back?: () => void; onDone: (v: 'confirmed' | 'not_me' | 'maybe', claimed?: string) => void }) {
  const { t, lang } = useLang()
  const [cnic, setCnic] = useState('')
  const [res, setRes] = useState<IdentityLookup | null>(null)
  const [err, setErr] = useState('')
  const [checking, setChecking] = useState(false)

  const look = async () => {
    setChecking(true); setErr('')
    try { setRes(await api.identityLookup(c.id, cnic)) } catch (e) { setErr(errorText(e, lang)) }
    setChecking(false)
  }
  const again = () => { setRes(null); setCnic('') }
  const r = res?.record

  return (
    <StepFrame step={3} title={t('step.3.title')} prompt={t('prompt.step_3')} resume={resume} save={save} busy={busy || checking} onBack={back}>
      {!res ? (
        <div className="space-y-4">
          <p className="text-lg">{t('step.3.typehelp')}</p>
          <NumberPad value={cnic} onChange={setCnic} maxLength={13} format={formatCnic} />
          {err && <Notice tone="danger" icon="warning">{err}</Notice>}
          <Btn block disabled={cnic.length !== 13 || checking} onClick={look}>{checking ? t('common.wait') : t('step.3.find')}</Btn>
        </div>
      ) : r ? (
        <div className="space-y-4">
          <p className="text-lg font-semibold">{res.same_person ? t('step.3.found') : t('step.3.found_other')}</p>
          <div className="rounded-2xl bg-paper p-5 text-center">
            <Icon name="person" size={44} className="mx-auto text-brand" />
            <p className="mt-2 text-3xl font-bold leading-snug" data-testid="found-name">{lang === 'ur' ? r.name_ur : r.name_roman}</p>
            {lang === 'ur' && <p className="ltr text-muted">{r.name_roman}</p>}
            {res.same_person && (
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-start text-lg">
                <dt className="text-muted">{t('step.3.father')}</dt><dd className="font-semibold">{r.father_or_husband}</dd>
                <dt className="text-muted">{t('step.3.dob')}</dt><dd className="ltr font-semibold">{r.dob}</dd>
                <dt className="text-muted">{t('step.3.district')}</dt><dd className="font-semibold">{r.district}</dd>
                <dt className="text-muted">{t('step.3.cnic')}</dt><dd className="ltr font-semibold tracking-wider" data-testid="cnic-masked">{r.cnic_masked}</dd>
              </dl>
            )}
          </div>
          {!res.same_person && <Notice tone="ask" icon="help">{t('step.3.other_note')}</Notice>}
          <p className="text-lg font-semibold">{t('step.3.question')}</p>
          <div className="grid gap-3">
            <Btn variant="success" block icon="check" disabled={busy} onClick={() => onDone('confirmed', cnic)}>{t('common.yes')}</Btn>
            <Btn variant="danger-outline" block icon="x" disabled={busy} onClick={() => onDone('not_me')}>{t('claim.notMe')}</Btn>
          </div>
          <Btn variant="ghost" block onClick={again}>{t('step.3.retype')}</Btn>
        </div>
      ) : (
        <div className="space-y-4">
          <Notice tone="danger" icon="warning"><b>{t('step.3.none')}</b></Notice>
          <Btn block onClick={again}>{t('step.3.retype')}</Btn>
        </div>
      )}
    </StepFrame>
  )
}

// ------------------------------------------------------------------ step 4
function HouseholdStep({ c, resume, save, busy, back, onDone }: { c: CaseDetail; resume?: string; save: SaveState; busy: boolean; back?: () => void; onDone: (ok: boolean) => void }) {
  const { t, lang } = useLang()
  const [n, setN] = useState('')
  const [wrong, setWrong] = useState(false)
  const [left, setLeft] = useState(3)
  const [err, setErr] = useState('')
  const [checking, setChecking] = useState(false)
  const check = async () => {
    setChecking(true); setErr('')
    try {
      const r = await api.householdCheck(c.id, Number(n))
      setLeft(r.tries_left)
      if (r.match) onDone(true)
      else if (r.locked) onDone(false)
      else { setWrong(true); setN('') }
    } catch (e) { setErr(errorText(e, lang)) }
    setChecking(false)
  }
  return (
    <StepFrame step={4} title={t('step.4.title')} prompt={t('prompt.step_4')} resume={resume} save={save} busy={busy || checking} onBack={back}>
      <div className="space-y-4">
        <p className="text-lg font-semibold">{t('step.4.ask')}</p>
        <NumberPad value={n} onChange={(v) => { setN(v); setWrong(false) }} maxLength={2} />
        {wrong && <Notice tone="danger" icon="warning">{t('step.4.wrong', { n: left })}</Notice>}
        {err && <Notice tone="danger" icon="warning">{err}</Notice>}
        <Btn block disabled={!n || Number(n) < 1 || checking || busy} onClick={check}>{checking ? t('common.wait') : t('step.4.check')}</Btn>
      </div>
    </StepFrame>
  )
}

// ------------------------------------------------------------------ step 6
function PayoutStep({ c, draft, resume, save, busy, helper, back, onDone }: { c: CaseDetail; draft: Draft; resume?: string; save: SaveState; busy: boolean; helper: boolean; back?: () => void; onDone: (patch: Partial<Draft>) => void }) {
  const { t, lang } = useLang()
  const [acc, setAcc] = useState((draft.payout_account as string) ?? c.payout_account ?? '')
  const [valid, setValid] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [err, setErr] = useState('')
  const online = useOnline()

  // The number is only typed and sent for a shape check. We never show an account number or a holder name back.
  const check = async () => {
    setChecking(true); setErr('')
    try {
      const r = await api.verifyAccount(acc)
      setValid(r.valid)
      if (r.valid) onDone({ payout_account: acc, payout_title: '', payout_ok: true })
    } catch (e) { setErr(errorText(e, lang)) }
    setChecking(false)
  }
  return (
    <StepFrame step={6} title={t('step.6.title')} prompt={t('prompt.step_6')} resume={resume} save={save} busy={busy} onBack={back}>
      <div className="space-y-4">
        <p className="text-lg">{t('step.6.enter')}</p>
        <NumberPad value={acc} onChange={(v) => { setAcc(v); setValid(null) }} maxLength={11} format={(v) => [v.slice(0, 4), v.slice(4)].filter(Boolean).join('-')} />
        {valid === false && <Notice tone="danger" icon="warning">{t('step.6.invalid')}</Notice>}
        {err && <Notice tone="danger" icon="warning">{err}</Notice>}
        {!online && <Notice tone="ask" icon="wifioff">{t('step.6.offline')}</Notice>}
        <Btn block disabled={acc.length !== 11 || checking || busy || !online} onClick={check}>{checking ? t('common.wait') : t('step.6.check')}</Btn>
      </div>
    </StepFrame>
  )
}

// ------------------------------------------------------------------ step 8
function ResultStep({ c, caseId, base, helper, online, resume }: { c: CaseDetail; caseId: string; base: string; helper: boolean; online: boolean; resume?: string }) {
  const { t, lang } = useLang()
  const { ops, tick } = useOutbox()
  const [decision, setDecision] = useState<DecisionCard | null>(c.status === 'awaiting_proof' ? null : (c.latest_decision ?? null))   // an old 'send one more thing' must not flash after she has just sent it
  const [error, setError] = useState<unknown>(null)
  const waiting = ops.some((o) => o.caseId === caseId)
  const submitWaiting = ops.some((o) => o.caseId === caseId && o.label === 'submit')

  // fetch the answer when nothing waits on the phone; ask again every 10 seconds while we have none
  useEffect(() => {
    if (waiting || !online) return
    let alive = true
    const load = () => api.decisions(caseId).then((d) => { if (alive) { setDecision(d[0] ?? null); setError(null) } }, (e) => { if (alive) setError(e) })
    load()
    const timer = setInterval(() => { if (!document.hidden) load() }, 10000)
    return () => { alive = false; clearInterval(timer) }
  }, [caseId, waiting, online, tick])

  // the same page is used again after "send one more paper"
  // staff asked for a paper: straight to taking it (it is sent by itself afterwards)
  const sendMore = (doc: string | null | undefined) => navigate(`${base}/${caseId}/5?${doc === 'cnic_front' || doc === 'cnic_back' ? `doc=${doc}&` : ''}redo=1`)

  if (submitWaiting || (waiting && !decision)) {
    return (
      <StepFrame step={8} title={t('step.8.waiting')} prompt={t('prompt.step_8_waiting')} promptKey="step_8_waiting" resume={resume} save="phone">
        <div className="text-center space-y-3" data-testid="waiting-send">
          <Icon name="phone" size={64} className="mx-auto text-human" />
          <p className="text-xl font-semibold">{t('save.phone')}</p>
          <p className="text-muted">{t('step.8.waiting_text')}</p>
        </div>
      </StepFrame>
    )
  }
  if (!decision) {
    return error ? <ErrorBox error={error} onRetry={() => setError(null)} /> : <Spinner label={t('common.wait')} />
  }
  return (
    <div className="space-y-4">
      <ProgressDots step={8} />
      <ResultCard decision={decision} quarter={c.quarter} amount={c.amount} onSendMore={sendMore} onDone={() => navigate(helper ? '/helper' : '/consents')} />
      {resume && <p className="text-center text-sm text-muted">{t('resume.code')}: <b className="ltr text-ink tracking-widest">{resume}</b></p>}
    </div>
  )
}



// runs one action when it appears (used to skip a step a helper must not repeat)
function RunOnce({ run, label }: { run: () => void; label: string }) {
  useEffect(() => { run() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return <Spinner label={label} />
}
