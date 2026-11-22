// Admin: the Digital Twin. Replay stored cases under a draft rule version and see who would change zone.
// Preview only: nothing is saved, nobody is told.
import { useEffect, useState } from 'react'
import { api, errorText } from '../../api'
import type { TwinResult, Zone } from '../../api/types'
import { Btn, Card, ErrorBox, Notice, PageHead, Spinner, ZoneChip } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { useAsync } from '../../components/useAsync'
import { currentQuery, navigate, useHash } from '../../router'
import { staffReason } from '../../data/reasons'

export default function Twin() {
  useHash()
  const sets = useAsync(() => api.ruleSets(), [])
  const [rs, setRs] = useState(currentQuery().get('rs') ?? '')
  const [res, setRes] = useState<TwinResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const drafts = (sets.data ?? []).filter((s) => s.status === 'draft')
  useEffect(() => { if (!rs && drafts[0]) setRs(drafts[0].id) }, [rs, drafts])

  const run = async () => {
    setBusy(true); setError(''); setRes(null)
    try { setRes(await api.twin(rs, 500)) } catch (e) { setError(errorText(e, 'en')) }
    setBusy(false)
  }
  const chosen = sets.data?.find((s) => s.id === rs)
  const active = sets.data?.find((s) => s.status === 'active')
  const moveEntries = Object.entries(res?.moves ?? {}).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-5">
      <PageHead title="Digital Twin" sub="Replay past cases under a draft version. See who would change, before you make it live." />
      {sets.loading ? <Spinner /> : sets.error ? <ErrorBox error={sets.error} onRetry={sets.reload} /> : (
        <Card className="space-y-4">
          {drafts.length === 0 ? <Notice icon="info">There is no draft version yet. Make one on the Rules page first.</Notice> : (
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[16rem] flex-1">
                <label className="label" htmlFor="rs">Draft to test</label>
                <select id="rs" className="input" value={rs} onChange={(e) => { setRs(e.target.value); setRes(null) }}>
                  {drafts.map((s) => <option key={s.id} value={s.id}>Version {s.version} (cutoff {s.params.cutoff}, amount {s.params.amount})</option>)}
                </select>
              </div>
              <Btn icon="copy" disabled={!rs || busy} onClick={run}>{busy ? 'Replaying…' : 'Run the replay'}</Btn>
            </div>
          )}
          {chosen && active && <p className="text-sm text-muted">Comparing live version {active.version} (cutoff {active.params.cutoff}) with draft version {chosen.version} (cutoff {chosen.params.cutoff}).</p>}
          {error && <Notice tone="danger" icon="warning">{error}</Notice>}
        </Card>
      )}

      {res && (
        <div className="space-y-5" data-testid="twin-result">
          <div className="grid gap-4 sm:grid-cols-4">
            <Big label="Cases replayed" value={res.cases} />
            <Big label="Change zone" value={res.changed} tone="ask" />
            <Big label="Approvals change" value={res.approvals_changed ?? 0} tone="human" />
            <Big label="Cost: before to after" value={res.cost_before != null ? `${res.cost_before} → ${res.cost_after}` : '-'} />
          </div>
          <Card className="space-y-3">
            <h2>Who moves where</h2>
            {moveEntries.length === 0 ? <p className="text-muted">Nobody changes zone.</p> : (
              <table className="tbl w-full max-w-lg"><thead><tr><th>Move</th><th className="text-end">Cases</th></tr></thead>
                <tbody>{moveEntries.map(([k, n]) => (
                  <tr key={k}><td className="ltr font-semibold">{k.replace('->', ' → ')}</td><td className="text-end tabular-nums font-bold">{n}</td></tr>
                ))}</tbody></table>
            )}
          </Card>
          {(res.examples?.length ?? 0) > 0 && (
            <Card className="space-y-3 overflow-x-auto">
              <h2>Example cases</h2>
              <table className="tbl w-full min-w-[560px]"><thead><tr><th>Case</th><th>Before</th><th /><th>After</th><th>Reason now</th></tr></thead>
                <tbody>{res.examples!.map((e) => (
                  <tr key={e.case_id}><td className="font-semibold">{e.name ?? e.case_id}</td>
                    <td><ZoneChip zone={e.before.zone as Zone} /></td><td><Icon name="fwd" size={16} className="text-muted" /></td>
                    <td><ZoneChip zone={e.after.zone as Zone} /></td>
                    <td className="text-sm text-muted">{e.after.reason_code ? staffReason(e.after.reason_code) : e.note}</td></tr>
                ))}</tbody></table>
            </Card>
          )}
          <div className="flex flex-wrap gap-3">
            <Btn variant="secondary" onClick={() => navigate(`/rules/${rs}`)}>Open this draft</Btn>
          </div>
        </div>
      )}
    </div>
  )
}

const Big = ({ label, value, tone = 'brand' }: { label: string; value: number | string; tone?: 'brand' | 'ask' | 'human' }) => (
  <Card className="text-center">
    <p className="text-sm font-semibold text-muted">{label}</p>
    <p className={`mt-1 text-3xl font-bold tabular-nums ${tone === 'ask' ? 'text-ask' : 'text-ink'}`}>{value}</p>
  </Card>
)
