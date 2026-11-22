// The full trace of a decision: every step the engine took, in order. Used by the officer and the auditor.
import type { Check, TraceStep } from '../api/types'
import { Icon } from './Icon'
import { VerdictChip } from './ui'
import { staffReason } from '../data/reasons'
import { useLang } from '../i18n'

const FRIENDLY: Record<string, string> = {
  consent: 'Permission', cnic: 'ID card', documents: 'Papers', eligibility: 'Household score', exclusions: 'Exclusion rules',
  identity_match: 'Name match', identity: 'Name match', llm_advice: 'Assistant note', model: 'Eligibility model',
  card_vs_record: 'Card vs record', payout_account: 'Payout account', scam: 'Scam check', engine: 'Rule check', 'rule engine': 'Rule check', rules: 'Rule check',
}
// strip internal leftovers like "(seed)" or "#2b178056" and start with a capital
export const tidy = (t?: string) => (t ?? '').replace(/\s*\(seed\)/gi, '').replace(/\s*#[0-9a-f]{6,}/gi, '').replace(/^./, (c) => c.toUpperCase())
export const nice = (n: string) => FRIENDLY[n] ?? FRIENDLY[n.replace(/_/g, ' ')] ?? (n.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()))

export function ChecksList({ checks }: { checks: Check[] }) {
  const { lang } = useLang()
  return (
    <ul className="divide-y divide-line/70 rounded-2xl border border-line/70 bg-white overflow-hidden">
      <li className="hidden sm:grid gap-x-4 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted sm:grid-cols-[10rem_auto_1fr_5.5rem]" aria-hidden="true">
        <span>Check</span><span>Result</span><span>What was found</span><span className="text-end">How sure</span>
      </li>
      {checks.map((c) => (
        <li key={c.name} className="grid items-center gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[10rem_auto_1fr_5.5rem]" data-verdict={c.verdict}>
          <span className="font-semibold">{nice(c.name)}</span>
          <span><VerdictChip verdict={c.verdict} /></span>
          <span className="text-muted text-sm min-w-0 break-words">{tidy(/^R_[A-Z_]+$/.test(c.detail ?? '') ? staffReason(c.detail, lang) : c.detail)}</span>
          <span className="ltr text-end text-sm font-semibold tabular-nums">{c.confidence != null && c.name !== 'eligibility' ? `${Math.round(c.confidence * 100)}%` : ''}</span>
        </li>
      ))}
    </ul>
  )
}

export function TraceList({ trace }: { trace: TraceStep[] }) {
  if (!trace?.length) return <p className="text-muted">No trace was stored.</p>
  return (
    <ol className="space-y-2" aria-label="Decision trace">
      {trace.map((s, i) => {
        const { step, what, rule, fired, ...rest } = s
        return (
          <li key={i} className={`flex gap-3 rounded-xl border px-4 py-2.5 ${fired ? 'bg-ask-soft border-ask/30' : 'bg-white border-line'}`}>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand text-sm font-bold">{step ?? i + 1}</span>
            <div className="min-w-0 text-sm">
              <p className="font-semibold">
                {String(what).replace(/_/g, ' ')}{rule ? `: ${rule}` : ''}
                {typeof fired === 'boolean' && <span className={`ms-2 inline-flex items-center gap-1 ${fired ? 'text-ask' : 'text-muted'}`}><Icon name={fired ? 'warning' : 'check'} size={14} />{fired ? 'fired' : 'did not fire'}</span>}
              </p>
              {Object.keys(rest).length > 0 && <p className="ltr break-words text-muted">{Object.entries(rest).map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join('  ')}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
