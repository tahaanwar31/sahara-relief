// Officer: one case. The decision card, the checks, the papers, the "I am not sure" notes, the full trace,
// and four actions. The service enforces who may decide; the screen explains what it will refuse.
import { useState } from 'react'
import { api, errorText } from '../../api'
import type { CaseNotes, OfficerDecisionInput } from '../../api/types'
import { Btn, Card, Chip, ConsentChip, ErrorBox, Notice, PageHead, Spinner, VerdictChip, ZoneChip, fmtDateTime, money } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { ChecksList, TraceList } from '../../components/Trace'
import { useAsync } from '../../components/useAsync'
import { useLang, pick } from '../../i18n'
import { reasonText, staffReason } from '../../data/reasons'
import { nice, tidy } from '../../components/Trace'

const RESULT: Record<string, string> = { HUMAN_REVIEW: 'Needs a person', APPROVE: 'Approved', ASK_MORE: 'Needs more proof', HOLD: 'On hold', REJECT: 'Rejected' }
const docName = (t: string) => ({ cnic_front: 'ID card (front)', cnic_back: 'ID card (back)', cnic: 'ID card', payment_proof: 'Payment proof', utility_bill: 'Utility bill', death_certificate: 'Death certificate' } as Record<string, string>)[t] ?? t.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
const cap = (t: string) => t.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
import { navigate } from '../../router'

type Choice = OfficerDecisionInput['decision']
const CHOICES: { key: Choice; label: string; icon: 'check' | 'x' | 'camera' | 'pause'; cls: string; needNote: boolean }[] = [
  { key: 'approve', label: 'Approve', icon: 'check', cls: 'border-auto text-auto bg-auto-soft', needNote: false },
  { key: 'reject', label: 'Reject', icon: 'x', cls: 'border-danger text-danger bg-danger-soft', needNote: true },
  { key: 'ask_more', label: 'Ask for more proof', icon: 'camera', cls: 'border-ask text-ask bg-ask-soft', needNote: false },
  { key: 'hold', label: 'Hold', icon: 'pause', cls: 'border-ink text-ink bg-paper', needNote: true },
]

// "Ask for more proof": the paper the person is asked to send again, with the standard message for it
const PAPER_ASK = [
  { key: 'cnic_front', label: 'ID card (front)', msg: 'Please upload the front of your ID card again.' },
  { key: 'cnic_back', label: 'ID card (back)', msg: 'Please upload the back of your ID card again.' },
  { key: 'cnic_both', label: 'ID card (front and back)', msg: 'Please upload the front and the back of your ID card again.' },
  { key: 'other', label: 'Another paper (explain in the message)', msg: 'Please send one more paper.' },
]

export default function CaseView({ params }: { params: Record<string, string> }) {
  const { lang } = useLang()
  const id = params.id
  const c = useAsync(() => api.getCase(id), [id], 10000)
  const decisions = useAsync(() => api.decisions(id), [id])
  const notes = useAsync<CaseNotes | null>(() => api.notes(id).catch(() => null), [id])
  const limit = useAsync(() => api.ruleSets().then((r) => r.find((x) => x.status === 'active')?.params.second_approver_over ?? 20000).catch(() => 20000), [])

  const [choice, setChoice] = useState<Choice | null>(null)
  const [note, setNote] = useState('')
  const [paperAsk, setPaperAsk] = useState('cnic_front')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [open, setOpen] = useState(false)
  // opening a paper the person sent: the photo is fetched when asked, shown in a window, and forgotten when it closes
  const [paper, setPaper] = useState<{ title: string; src: string } | null>(null)
  const [paperBusy, setPaperBusy] = useState(false)
  const [paperErr, setPaperErr] = useState('')
  const openPaper = async (docId: string, title: string) => {
    setPaperBusy(true); setPaperErr('')
    try { const r = await api.documentImage(id, docId); setPaper({ title, src: `data:${r.content_type};base64,${r.data}` }) }
    catch (e) { setPaperErr(errorText(e, lang)) }
    setPaperBusy(false)
  }

  if (c.loading) return <Spinner />
  if (c.error || !c.data) return <ErrorBox error={c.error} onRetry={c.reload} />
  const cs = c.data
  const d = cs.latest_decision ?? decisions.data?.[0]
  const withdrawn = cs.consent_status === 'withdrawn' || cs.consent_status === 'expired'
  const over = cs.needs_second_approver ?? cs.amount > (limit.data ?? 20000)
  const picked = CHOICES.find((x) => x.key === choice)
  const canSend = !!choice && !withdrawn && !busy && (!picked?.needNote || note.trim().length > 2)

  const send = async () => {
    if (!choice) return
    setBusy(true); setError(''); setDone('')
    try {
      const ask = PAPER_ASK.find((o) => o.key === paperAsk)
      const r = await api.officerDecision(id, choice === 'ask_more'
        ? { decision: choice, note: note.trim() || ask?.msg || 'Please send one more paper.', doc_type: paperAsk as 'cnic_front' | 'cnic_back' | 'cnic_both' | 'other' }
        : { decision: choice, note: note.trim() || (choice === 'approve' ? 'Approved after checking the papers.' : note.trim()) })   // the note is optional on screen, the service wants a few words
      setDone(r.message ?? 'Saved.')
      setChoice(null); setNote(''); setOpen(false)
      c.reload(); decisions.reload()
    } catch (e) { setError(errorText(e, lang)); setOpen(false) }
    setBusy(false)
  }

  return (
    <div className="space-y-5">
      <button type="button" onClick={() => navigate('/queue')} className="inline-flex items-center gap-1 font-semibold text-brand min-h-[44px]"><Icon name="back" size={20} /> Back to the queue</button>
      <PageHead title={cs.person?.name_roman ?? cs.id} sub={<span className="inline-flex flex-wrap items-center gap-x-2">{cs.person?.name_ur && <bdi>{cs.person.name_ur}</bdi>}<span aria-hidden>·</span><bdi dir="ltr">{cs.person?.cnic_masked}</bdi><span aria-hidden>·</span><bdi dir="ltr">{cs.quarter}</bdi></span>}
        right={<div className="flex flex-wrap gap-2"><ConsentChip status={cs.consent_status} />{cs.zone && <ZoneChip zone={cs.zone} />}<Chip tone="neutral">{cap(cs.status)}</Chip></div>} />

      {withdrawn && <Notice tone="danger" icon="lock"><b>Permission was taken back.</b> This person withdrew consent, so no decision can be made. The service will refuse any action.</Notice>}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
        <div className="space-y-5">
          {d && (
            <Card className="space-y-3" >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2>Decision card</h2>
                <span className="text-sm text-muted ltr">{fmtDateTime(d.created_at)} · {d.actor_type === 'user' ? 'admin' : 'system'}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Zone" value={<ZoneChip zone={d.zone} />} />
                <Stat label="Result" value={<b>{RESULT[d.result] ?? cap(d.result)}</b>} />
                <Stat label="Confidence" value={<b className="ltr">{Math.round(d.confidence * 100)}%</b>} />
              </div>
              <p className="rounded-xl bg-paper p-3">{staffReason(d.reason_code, lang)}</p>
              <p className="text-sm text-muted ltr">Rules version {d.rule_version}{d.approve_line != null ? ` · approves alone above ${Math.round(Number(d.approve_line) * 100)}% sure` : ''}</p>
              <h3 className="pt-1">Checks</h3>
              <ChecksList checks={d.checks} />
            </Card>
          )}

          {notes.data?.package && <NotesCard notes={notes.data} />}

          <Card className="space-y-3">
            <h2>Papers</h2>
            {(cs.documents ?? []).length === 0 ? <p className="text-muted">No papers were sent.</p> : (
              <ul className="divide-y divide-line">
                {cs.documents!.map((p) => (
                  <li key={p.id} className="py-3 flex flex-wrap items-center gap-3">
                    <Icon name="doc" className="text-brand" />
                    <span className="font-semibold sm:w-44">{docName(p.doc_type)}</span>
                    <Chip tone={p.verdict === 'ok' ? 'auto' : p.verdict === 'suspicious' ? 'danger' : 'ask'} icon={p.verdict === 'ok' ? 'check' : 'warning'}>{p.verdict === 'ok' ? 'clear' : p.verdict === 'suspicious' ? 'needs a closer look' : 'photo not clear'}</Chip>
                    <Btn variant="secondary" small icon="doc" onClick={() => void openPaper(p.id, docName(p.doc_type))} disabled={paperBusy}>{paperBusy ? '…' : 'View'}</Btn>
                    <span className="text-sm text-muted ltr">
                      {p.signals?.confidence != null && `Read with ${Math.round(p.signals.confidence * 100)}% confidence`}
                      {p.signals?.edit_signs?.length ? ` · ${p.signals.edit_signs.join(', ')}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {paperErr && <Notice tone="danger" icon="warning">{paperErr}</Notice>}
            <p className="text-sm text-muted">Each time you open a paper, the diary records who opened it.</p>
          </Card>
          {paper && (
            <div className="fixed inset-0 z-40 grid place-items-center bg-ink/60 p-4" role="dialog" aria-modal="true" aria-label={paper.title}>
              <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-card bg-white p-4 space-y-3 shadow-card">
                <div className="flex items-center justify-between gap-3"><h2>{paper.title}</h2><Btn variant="secondary" small icon="x" onClick={() => setPaper(null)}>Close</Btn></div>
                <img src={paper.src} alt={paper.title} className="mx-auto max-h-[75vh] w-auto rounded-xl border border-line" />
              </div>
            </div>
          )}

          <Card>
            <button type="button" className="flex w-full items-center justify-between font-bold text-lg min-h-[44px]" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              <span>Full trace (every step)</span><Icon name="fwd" className={open ? 'rotate-90' : ''} />
            </button>
            {open && d && <div className="mt-3"><TraceList trace={d.trace} /></div>}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="space-y-4 lg:sticky lg:top-4">
            <h2>Your decision</h2>
            <p className="text-sm text-muted">Amount: <b className="text-ink ltr">{money(cs.amount)}</b></p>
            {over && <Notice tone="ask" icon="people" ><b>Second approver needed.</b> The amount is above {money(limit.data ?? 20000)}. A different admin must also approve.</Notice>}
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Decision">
              {CHOICES.map((o) => (
                <button key={o.key} type="button" role="radio" aria-checked={choice === o.key} disabled={withdrawn} onClick={() => setChoice(o.key)}
                  className={`min-h-[84px] rounded-2xl border-2 flex flex-col items-center justify-center gap-1 font-bold px-2 text-center transition-all disabled:opacity-40 ${choice === o.key ? `${o.cls} ring-4 ring-offset-1 ring-current/20` : 'border-line bg-white text-ink hover:bg-paper'}`}>
                  <Icon name={o.icon} size={28} />{o.label}
                </button>
              ))}
            </div>
            {choice === 'ask_more' && (
              <div>
                <label className="label" htmlFor="paper-ask">Which paper should she send again?</label>
                <select id="paper-ask" className="input" value={paperAsk} onChange={(e) => setPaperAsk(e.target.value)} data-testid="paper-ask">
                  {PAPER_ASK.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label" htmlFor="note">{choice === 'ask_more' ? 'Message to her (she will read this; leave empty to use the standard words)' : `Note ${picked?.needNote ? '(required)' : '(optional)'}`}</label>
              <textarea id="note" className="input py-3 min-h-[100px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder={choice === 'ask_more' ? (PAPER_ASK.find((o) => o.key === paperAsk)?.msg ?? '') : 'Why? Short and plain.'} />
            </div>
            {error && <Notice tone="danger" icon="warning">{error}</Notice>}
            {done && <Notice tone="auto" icon="check">{done}</Notice>}
            <Btn block disabled={!canSend} onClick={send} icon="check">{busy ? 'Saving…' : choice ? `Send: ${picked?.label}` : 'Choose an action'}</Btn>
            <p className="text-xs text-muted">Every choice makes a new row in the diary. Nothing is overwritten.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-xl bg-paper p-3"><p className="text-xs uppercase tracking-wide text-muted font-semibold">{label}</p><div className="mt-1">{value}</div></div>
)

function NotesCard({ notes }: { notes: CaseNotes }) {
  const { lang } = useLang()
  const p = notes.package
  const summary = typeof p.summary === 'string' ? p.summary : pick('en', p.summary)
  return (
    <Card className="space-y-3 bg-paper" >
      <h2 className="flex items-center gap-2 text-ink"><Icon name="person" /> "I am not sure" notes</h2>
      {summary && <p className="text-lg">{summary}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {p.why_unsure && p.why_unsure.length > 0 && <List title="Why it is unsure" items={p.why_unsure} />}
        {p.missing && p.missing.length > 0 && <List title="Missing" items={p.missing} />}
        {p.suggested && p.suggested.length > 0 && <List title="Suggested next steps" items={p.suggested} />}
        {p.checked && p.checked.length > 0 && <div><h3 className="mb-1">Checked</h3><ul className="space-y-1">{p.checked.map((x) => <li key={x.name} className="flex items-center gap-2 text-sm"><VerdictChip verdict={x.verdict} /> {nice(x.name)}</li>)}</ul></div>}
      </div>
      {p.compare && p.compare.length > 0 && (
        <div className="overflow-x-auto">
          <h3 className="mb-1">Same person? Side by side</h3>
          <table className="tbl w-full text-sm bg-white rounded-xl">
            <thead><tr><th>Detail</th><th>Her registration record</th><th>Government record</th>{p.compare.some((r) => r.card_agree) && <th>Her ID card photo</th>}<th>Match</th></tr></thead>
            <tbody>{p.compare.map((r) => (
              <tr key={r.field}><td className="font-semibold">{r.field}</td><td className="ltr">{r.record_a}</td><td className="ltr">{r.record_b}</td>
                {p.compare!.some((x) => x.card_agree) && <td className={`ltr ${r.card_agree === 'no' ? 'text-danger font-semibold' : ''}`}>{r.card ?? ''}{r.card_agree === 'no' ? ' ✗' : ''}</td>}
                <td>{r.card_agree === 'no'
                  ? <Chip tone="danger">card differs</Chip>
                  : <Chip tone={r.agree === 'yes' ? 'auto' : r.agree === 'close' ? 'ask' : 'danger'}>{r.field === 'dob' && r.agree === 'close' ? 'close (year only)' : r.agree}</Chip>}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
const List = ({ title, items }: { title: string; items: string[] }) => (
  <div><h3 className="mb-1">{title}</h3><ul className="list-disc ps-5 space-y-0.5 text-sm">{items.map((i) => <li key={i}>{i}</li>)}</ul></div>
)
