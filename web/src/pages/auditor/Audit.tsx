// Auditor: the diary (read only). Filters, a big "Verify the diary" button, the decision trace, the rule version used,
// and the consent history. Nothing on this page can change anything.
import { useMemo, useState } from 'react'
import { api, errorText } from '../../api'
import type { AuditEntry, AuditVerify, TraceStep } from '../../api/types'
import { Btn, Card, Chip, ErrorBox, Notice, PageHead, Spinner, fmtDateTime } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { TraceList } from '../../components/Trace'
import { useAsync } from '../../components/useAsync'

const NICE: Record<string, string> = {
  'data.read': 'Record opened', 'auth.login_ok': 'Signed in', 'auth.login_failed': 'Sign-in failed', 'decision.made': 'Decision made',
  'decision.officer': 'Reviewer decision', 'case.submitted': 'Claim sent', 'case.created': 'Claim started', 'consent.granted': 'Consent given',
  'consent.withdrawn': 'Consent taken back', 'consent.granted_with_pin': 'Consent given with her own PIN', 'rules.activated': 'Rules made live',
  'rule_set.created': 'Draft rules saved', 'api_key.created': 'API key made', 'api_key.revoked': 'API key revoked', 'user.local_login_created': 'Login created',
}
const niceAction = (a: string) => NICE[a] ?? a.replace(/[._]/g, ' ').replace(/^./, (c) => c.toUpperCase())

const FILTERS: { key: string; label: string; entity?: string }[] = [
  { key: 'all', label: 'Everything' },
  { key: 'decisions', label: 'Decisions', entity: 'decisions' },
  { key: 'cases', label: 'Cases', entity: 'cases' },
  { key: 'consents', label: 'Consent history', entity: 'consents' },
  { key: 'rules', label: 'Rule changes', entity: 'rule_sets' },
  { key: 'documents', label: 'Documents', entity: 'documents' },
  { key: 'access', label: 'Data access' },
]

export default function Audit() {
  const [filter, setFilter] = useState('all')
  const [text, setText] = useState('')
  const [open, setOpen] = useState<AuditEntry | null>(null)
  const entity = FILTERS.find((f) => f.key === filter)?.entity
  const log = useAsync(() => api.audit({ entity_type: entity, limit: 300 }), [entity], 10000)

  const [verify, setVerify] = useState<AuditVerify | null>(null)
  const [vBusy, setVBusy] = useState(false)
  const [vErr, setVErr] = useState('')
  const runVerify = async () => {
    setVBusy(true); setVErr(''); setVerify(null)
    try { setVerify(await api.auditVerify()) } catch (e) { setVErr(errorText(e, 'en')) }
    setVBusy(false)
  }

  const rows = useMemo(() => {
    const s = text.trim().toLowerCase()
    return (log.data?.items ?? []).filter((e) => filter === 'access' ? String(e.action).startsWith('data.read') : (s.includes('login') || !String(e.action).startsWith('auth.login')) && (s.includes('read') || !String(e.action).startsWith('data.read'))).filter((e) => !s || [e.action, e.actor_role, e.actor_id, e.entity_id, e.result].some((v) => String(v ?? '').toLowerCase().includes(s)))
  }, [log.data, text, filter])

  return (
    <div className="space-y-5">
      <PageHead title="The diary" sub="Every important action is written once and chained to the one before. Read only." />

      <Card className="flex flex-wrap items-center gap-5" >
        <Btn icon="shield" className="min-h-[68px] px-8 text-xl" disabled={vBusy} onClick={runVerify}>{vBusy ? 'Checking every row…' : 'Verify the diary'}</Btn>
        <div className="min-w-[16rem] flex-1" aria-live="polite" data-testid="verify-result">
          {verify?.intact && <div className="flex items-center gap-3 text-auto"><span className="grid h-14 w-14 place-items-center rounded-full bg-auto-soft"><Icon name="check" size={34} stroke={3} /></span><div><p className="text-xl font-bold">The diary is intact</p><p className="text-sm text-muted">{verify.checked ?? 'All'} rows checked. No row was changed or removed.</p></div></div>}
          {verify && !verify.intact && <div className="flex items-center gap-3 text-danger"><span className="grid h-14 w-14 place-items-center rounded-full bg-danger-soft"><Icon name="x" size={34} stroke={3} /></span><div><p className="text-xl font-bold">The diary is broken at row {String(verify.broken_at)}</p><p className="text-sm text-muted">Rows from there on cannot be trusted. Tell the admin.</p></div></div>}
          {vErr && <Notice tone="danger" icon="warning">{vErr}</Notice>}
          {!verify && !vErr && !vBusy && <p className="text-muted">Press the button to check the whole chain from the first row. Sign-ins and record openings are hidden here. Use “Data access” or search “login” to see them.</p>}
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}
            className={`rounded-full border-2 px-4 min-h-[44px] font-semibold transition-colors ${filter === f.key ? 'bg-brand text-white border-brand' : 'bg-white border-line text-muted hover:bg-brand-soft'}`}>{f.label}</button>
        ))}
        <input className="input w-auto min-w-[14rem] flex-1 sm:flex-none ms-auto" placeholder="Search action, role, id…" aria-label="Search the diary" value={text} onChange={(e) => setText(e.target.value)} />
      </div>

      {log.loading ? <Spinner /> : log.error ? <ErrorBox error={log.error} onRetry={log.reload} /> : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <Card className="p-0 overflow-x-auto">
            <table className="tbl w-full" data-testid="diary">
              <thead><tr><th>#</th><th>When</th><th>Who</th><th>Action</th><th>Result</th></tr></thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={String(e.id)} onClick={() => setOpen(e)} className={`cursor-pointer ${open?.id === e.id ? 'bg-brand-soft' : ''}`} tabIndex={0} onKeyDown={(k) => k.key === 'Enter' && setOpen(e)}>
                    <td className="ltr tabular-nums text-muted">{String(e.id)}</td>
                    <td className="ltr whitespace-nowrap text-sm">{fmtDateTime(e.ts)}</td>
                    <td><Chip tone="neutral">{e.actor_role ?? e.actor_type}</Chip></td>
                    <td className="font-semibold">{niceAction(String(e.action))}<span className="block text-xs font-normal text-muted ltr">{e.entity_type}</span></td>
                    <td className="text-sm">{e.result ?? '-'}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={5} className="text-center text-muted py-8">Nothing matches.</td></tr>}
              </tbody>
            </table>
          </Card>
          <Card className="space-y-3 h-fit lg:sticky lg:top-4">
            {!open ? <p className="text-muted">Pick a row to see its details, the rule version used and the trace.</p> : <Detail e={open} />}
          </Card>
        </div>
      )}
    </div>
  )
}

function Detail({ e }: { e: AuditEntry }) {
  const trace = (e.details?.trace ?? null) as TraceStep[] | null
  const rest = { ...(e.details ?? {}) } as Record<string, unknown>
  delete rest.trace
  return (
    <div className="space-y-3">
      <h2>Row {String(e.id)}</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted">Action</dt><dd className="font-semibold">{e.action}</dd>
        <dt className="text-muted">Entity</dt><dd className="ltr break-all">{e.entity_type} {e.entity_id}</dd>
        <dt className="text-muted">Actor</dt><dd className="ltr break-all">{e.actor_role ?? e.actor_type} {e.actor_id ?? ''}</dd>
        <dt className="text-muted">Rule version</dt><dd className="ltr">{e.rule_version != null ? `v${e.rule_version}` : '-'}</dd>
        {e.model_version && <><dt className="text-muted">Model</dt><dd className="ltr">{e.model_version}</dd></>}
        {e.confidence != null && <><dt className="text-muted">Confidence</dt><dd className="ltr">{Math.round(e.confidence * 100)}%</dd></>}
        <dt className="text-muted">Hash</dt><dd className="ltr break-all font-mono text-xs">{e.hash?.slice(0, 32)}…</dd>
        <dt className="text-muted">Previous</dt><dd className="ltr break-all font-mono text-xs">{e.prev_hash?.slice(0, 32)}…</dd>
      </dl>
      {Object.keys(rest).length > 0 && <pre className="ltr rounded-xl bg-paper p-3 text-xs overflow-x-auto">{JSON.stringify(rest, null, 2)}</pre>}
      {trace && <><h3>Decision trace</h3><TraceList trace={trace} /></>}
    </div>
  )
}
