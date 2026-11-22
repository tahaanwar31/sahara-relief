// Admin: Policy. Three cost sliders and one chart (plain SVG): expected total cost against the approval line.
// This is a preview only; it changes nothing. Real costs live in the rule set.
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import type { CostCurve } from '../../api/types'
import { Btn, Card, ErrorBox, Notice, PageHead, Spinner } from '../../components/ui'

const DEFAULTS = { wrong_approve: 100, wrong_reject: 20, review: 3 }

export function CostChart({ curve }: { curve: CostCurve }) {
  const W = 680, H = 320, L = 58, R = 20, T = 20, B = 48
  const pts = curve.points
  const { path, x, y, ticks } = useMemo(() => {
    const xs = pts.map((p) => p.approve_line)
    const ys = pts.map((p) => p.expected_cost)
    const x0 = Math.min(...xs), x1 = Math.max(...xs)
    const y1 = Math.max(...ys) * 1.08 || 1
    const x = (v: number) => L + ((v - x0) / (x1 - x0 || 1)) * (W - L - R)
    const y = (v: number) => H - B - (v / y1) * (H - T - B)
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.approve_line).toFixed(1)},${y(p.expected_cost).toFixed(1)}`).join(' ')
    const ticks = { xs: [0.5, 0.6, 0.7, 0.8, 0.9, 1.0].filter((v) => v >= x0 - 0.001 && v <= x1 + 0.001), ys: [0, 0.25, 0.5, 0.75, 1].map((f) => f * y1 / 1.08) }
    return { path, x, y, ticks }
  }, [pts])
  const m = curve.min
  const cur = curve.current
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Expected cost against approval line. Lowest cost ${m.expected_cost.toFixed(2)} at ${m.approve_line}.`} data-testid="cost-chart">
      {ticks.ys.map((v) => (
        <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#EAE2D9" /><text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="12" fill="#5c6b6a">{v.toFixed(0)}</text></g>
      ))}
      {ticks.xs.map((v) => (
        <g key={v}><line x1={x(v)} x2={x(v)} y1={H - B} y2={H - B + 5} stroke="#7B6F66" /><text x={x(v)} y={H - B + 20} textAnchor="middle" fontSize="12" fill="#5c6b6a">{v.toFixed(1)}</text></g>
      ))}
      <text x={(L + W - R) / 2} y={H - 8} textAnchor="middle" fontSize="13" fill="#2B2420">Approval line (how sure the model must be to approve alone)</text>
      <text transform={`translate(14 ${(T + H - B) / 2}) rotate(-90)`} textAnchor="middle" fontSize="13" fill="#2B2420">Expected cost per case</text>
      <path d={path} fill="none" stroke="#2B2420" strokeWidth="3" strokeLinejoin="round" />
      {cur && (
        <g><line x1={x(cur.approve_line)} x2={x(cur.approve_line)} y1={T} y2={H - B} stroke="#E2693B" strokeDasharray="5 4" strokeWidth="2" />
          <text x={x(cur.approve_line) - 6} y={T + 12} textAnchor="end" fontSize="12" fontWeight="600" fill="#E2693B">current line {cur.approve_line}</text></g>
      )}
      <g><circle cx={x(m.approve_line)} cy={y(m.expected_cost)} r="7" fill="#E2693B" stroke="#fff" strokeWidth="2" />
        <text x={x(m.approve_line)} y={y(m.expected_cost) - 14} textAnchor="middle" fontSize="13" fontWeight="700" fill="#E2693B">lowest: {m.expected_cost.toFixed(2)} at {m.approve_line}</text></g>
    </svg>
  )
}

export default function Policy() {
  const [c, setC] = useState(DEFAULTS)
  const [curve, setCurve] = useState<CostCurve>()
  const [err, setErr] = useState<unknown>(null)
  const [tries, setTries] = useState(0)

  // wait a moment after the last slider move, then ask the service (preview only)
  useEffect(() => {
    let alive = true
    const t = setTimeout(() => { api.costCurve(c).then((r) => alive && (setCurve(r), setErr(null)), (e) => alive && setErr(e)) }, 250)
    return () => { alive = false; clearTimeout(t) }
  }, [c, tries])

  const line = 1 - c.review / c.wrong_approve
  return (
    <div className="space-y-5">
      <PageHead title="Policy: the cost of being wrong" sub="Move the sliders to see where the approval line should sit. This is a preview. It changes nothing." />
      <Card className="grid gap-6 md:grid-cols-3">
        <Slider label="A wrong approval costs" min={20} max={300} step={5} value={c.wrong_approve} onChange={(v) => setC({ ...c, wrong_approve: v })} hint="Paying someone who should not be paid." />
        <Slider label="A wrong rejection costs" min={5} max={100} step={1} value={c.wrong_reject} onChange={(v) => setC({ ...c, wrong_reject: v })} hint="Turning away someone who is eligible." />
        <Slider label="A person reviewing costs" min={1} max={20} step={1} value={c.review} onChange={(v) => setC({ ...c, review: v })} hint="Staff time for one case." />
      </Card>
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2>Total expected cost against the approval line</h2>
          <Btn small variant="secondary" onClick={() => setC(DEFAULTS)}>Reset to the rule set values</Btn>
        </div>
        {!curve && !err ? <Spinner /> : err ? <ErrorBox error={err} onRetry={() => setTries((t) => t + 1)} /> : curve && (
          <>
            <CostChart curve={curve} />
            <Notice tone="auto" icon="check">
              Lowest expected cost is <b className="ltr">{curve.min.expected_cost.toFixed(2)}</b> when the model must be at least <b className="ltr">{Math.round(curve.min.approve_line * 100)}%</b> sure to approve alone. The formula line (1 - review / wrong approval) is <b className="ltr">{line.toFixed(2)}</b>.
              Below the line a person decides, so nothing is rejected automatically.
            </Notice>
          </>
        )}
      </Card>
    </div>
  )
}

function Slider({ label, min, max, step, value, onChange, hint }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; hint: string }) {
  const id = label.replace(/\s/g, '-')
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between font-semibold"><span>{label}</span><span className="ltr text-2xl text-ink tabular-nums">{value}</span></label>
      <input id={id} type="range" style={{ accentColor: '#E2693B' }} min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-3 w-full h-11" />
      <p className="text-sm text-muted">{hint}</p>
    </div>
  )
}
