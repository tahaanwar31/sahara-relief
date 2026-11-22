// Evaluation and analytics: the honest numbers. Confusion matrix, false alarms, speed.
import { useState } from 'react'
import { api, errorText } from '../../api'
import { Btn, Card, Chip, Notice, PageHead, Spinner, fmtDateTime } from '../../components/ui'
import { useAsync } from '../../components/useAsync'

export default function Evaluation() {
  const ev = useAsync(() => api.evalLatest(), [])
  const an = useAsync(() => api.analytics(), [])
  const [running, setRunning] = useState(false)
  const [runErr, setRunErr] = useState('')
  const run = async () => {
    setRunning(true); setRunErr('')
    try { await api.evalRun(); ev.reload() } catch (e) { setRunErr(errorText(e, 'en')) }
    setRunning(false)
  }

  return (
    <div className="space-y-5">
      <PageHead title="Evaluation and analytics" sub="How the system did on a labelled test set. Wrong approvals are the costly mistake." right={<Btn variant="secondary" onClick={run} disabled={running}>{running ? 'Running, about 10 seconds…' : 'Run the evaluation'}</Btn>} />
      {runErr && <Notice tone="danger" icon="warning">{runErr}</Notice>}

      {an.data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label="Cases in the system" value={an.data.cases_total} />
          <Tile label="Approved by the system" value={an.data.by_zone.AUTO ?? 0} />
          <Tile label="Asked for more proof" value={an.data.by_zone.ASK_MORE ?? 0} />
          <Tile label="Sent to a person" value={an.data.by_zone.HUMAN ?? 0} />
          {an.data.queue_open != null && <Tile label="Waiting for review now" value={an.data.queue_open} />}
          {an.data.avg_decision_ms != null && <Tile label="Average decision time" value={`${an.data.avg_decision_ms} ms`} />}
          {an.data.override_rate != null && <Tile label="Reviewer overrides" value={`${Math.round(an.data.override_rate * 100)}%`} />}
          {an.data.scam_checked != null && <Tile label="Messages checked for scams" value={an.data.scam_checked} />}
        </div>
      )}

      {ev.loading || running ? <Spinner /> : ev.error || !ev.data ? (
        <Card className="space-y-3 py-10 text-center">
          <h2>No evaluation yet</h2>
          <p className="mx-auto max-w-md text-muted">Run it once to see the false alarms, the misses and the speed. It takes about 10 seconds and uses made-up cases only.</p>
          <Btn className="mx-auto" onClick={run}>Run the evaluation</Btn>
        </Card>
      ) : (
        <>
          {ev.data.notes && <Notice icon="info">{ev.data.notes}</Notice>}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="space-y-3">
              <h2>Confusion matrix</h2>
              <p className="text-sm text-muted">Rows: what should have happened. Columns: what the system did. {ev.data.n} test cases{ev.data.created_at ? `, run ${fmtDateTime(ev.data.created_at)}` : ''}.</p>
              <Matrix labels={ev.data.confusion.labels} m={ev.data.confusion.matrix} />
              <div className="flex flex-wrap gap-2 pt-1">
                {ev.data.accuracy != null && <Chip tone="brand">accuracy {Math.round(ev.data.accuracy * 100)}%</Chip>}
                {ev.data.auto_rate != null && <Chip tone="auto">approved alone {Math.round(ev.data.auto_rate * 100)}%</Chip>}
                {ev.data.human_rate != null && <Chip tone="human">sent to a person {Math.round(ev.data.human_rate * 100)}%</Chip>}
              </div>
            </Card>
            <Card className="space-y-3">
              <h2>Speed</h2>
              {ev.data.speed ? (
                <div className="space-y-3">
                  {([['Typical (median)', ev.data.speed.p50_ms], ['Slow cases (95th)', ev.data.speed.p95_ms], ['Per case, average', ev.data.speed.per_case_ms]] as [string, number | undefined][]).filter(([, v]) => v != null).map(([l, v]) => (
                    <div key={l}><div className="flex justify-between text-sm font-semibold"><span>{l}</span><span className="ltr tabular-nums">{v} ms</span></div>
                      <div className="mt-1 h-3 rounded-full bg-line"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, ((v as number) / Math.max(ev.data!.speed!.p95_ms ?? 1, 1)) * 100)}%` }} /></div></div>
                  ))}
                </div>
              ) : <p className="text-muted">No timing was recorded.</p>}
            </Card>
          </div>
          <Card className="space-y-3 overflow-x-auto">
            <h2>False alarms and misses</h2>
            <table className="tbl w-full min-w-[560px]" data-testid="false-alarms"><thead><tr><th>Case</th><th>Should be</th><th>System said</th><th>Note</th></tr></thead>
              <tbody>{ev.data.false_alarms.map((f) => (
                <tr key={f.case}><td className="font-semibold">{f.case}</td><td>{f.truth}</td><td><Chip tone={f.predicted === 'AUTO' && f.truth !== 'AUTO' ? 'danger' : 'ask'}>{f.predicted}</Chip></td><td className="text-sm text-muted">{f.note}</td></tr>
              ))}</tbody></table>
          </Card>
        </>
      )}
    </div>
  )
}

const Tile = ({ label, value }: { label: string; value: number | string }) => (
  <Card className="py-4"><p className="text-sm font-semibold leading-relaxed text-muted">{label}</p><p className="mt-1.5 text-3xl font-bold text-ink tabular-nums">{value}</p></Card>
)

function Matrix({ labels, m }: { labels: string[]; m: number[][] }) {
  const max = Math.max(1, ...m.flat())
  return (
    <table className="w-full text-center border-separate border-spacing-1" aria-label="Confusion matrix">
      <thead><tr><th /><th colSpan={labels.length} className="text-xs uppercase tracking-wide text-muted pb-1">System said</th></tr>
        <tr><th /> {labels.map((l) => <th key={l} className="text-sm font-semibold">{l}</th>)}</tr></thead>
      <tbody>{m.map((row, i) => (
        <tr key={i}><th className="text-sm font-semibold text-end pe-2">{labels[i]}</th>
          {row.map((v, j) => (
            <td key={j} className={`rounded-lg py-3 text-lg font-bold tabular-nums ${i === j ? 'text-auto' : v ? 'text-danger' : 'text-muted'}`}
              style={{ background: i === j ? `rgba(30,123,70,${0.1 + 0.5 * v / max})` : v ? `rgba(179,38,30,${0.08 + 0.4 * v / max})` : '#f6f4ee' }}>{v}</td>
          ))}</tr>
      ))}</tbody>
    </table>
  )
}
