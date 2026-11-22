// Admin: edit one rule version in a friendly form (numbers, switches, and "if ... then ..." rows).
// Saving never changes this version: it creates a NEW draft. Activate (admin only) asks first.
import { useEffect, useMemo, useState } from 'react'
import { api, errorText } from '../../api'
import type { Rule, RuleParams, RuleSet } from '../../api/types'
import { Btn, Card, Chip, ErrorBox, Notice, PageHead, Spinner } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { useAsync } from '../../components/useAsync'
import { useAuth } from '../../auth/AuthContext'
import { navigate } from '../../router'
import { FACTS, describe, fromSimple, toSimple, validateExpression, type Cond, type SimpleModel, type SimpleOp, type Problem } from '../../rules/jsonlogic'
import { validateSet } from '../../rules/validate'
import { allReasons, reasonCodes } from '../../data/reasons'

const OPS: { v: SimpleOp; l: string }[] = [
  { v: '==', l: 'is' }, { v: '!=', l: 'is not' }, { v: '<', l: 'is less than' }, { v: '<=', l: 'is at most' },
  { v: '>', l: 'is more than' }, { v: '>=', l: 'is at least' }, { v: 'missing', l: 'is missing' },
]

export default function RuleEditor({ params }: { params: Record<string, string> }) {
  const set = useAsync(() => api.ruleSet(params.id), [params.id])
  if (set.loading) return <Spinner />
  if (set.error || !set.data) return <ErrorBox error={set.error} onRetry={set.reload} />
  return <Editor key={set.data.id} set={set.data} />
}

function Editor({ set }: { set: RuleSet }) {
  const { user } = useAuth()
  const admin = user?.role === 'admin'
  const [p, setP] = useState<RuleParams>(set.params)
  const [rules, setRules] = useState<Rule[]>(set.rules ?? [])
  const [problems, setProblems] = useState<Problem[]>([])
  const [msg, setMsg] = useState<{ tone: 'auto' | 'danger'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const active = useAsync(() => api.ruleSets().then((r) => r.find((x) => x.status === 'active')), [])

  const local = useMemo(() => validateSet(p, rules), [p, rules])
  const err = (path: string) => problems.find((x) => x.path === path)?.message ?? local.find((x) => x.path === path)?.message
  const dirty = JSON.stringify({ p, rules }) !== JSON.stringify({ p: set.params, rules: set.rules ?? [] })
  const setCost = (k: keyof RuleParams['costs'], v: number) => setP({ ...p, costs: { ...p.costs, [k]: v } })

  const check = async () => {
    setBusy(true); setMsg(null)
    try {
      const r = await api.validateRules({ params: p, rules })
      setProblems(r.errors)
      setMsg(r.ok && local.length === 0 ? { tone: 'auto', text: 'All checks passed.' } : { tone: 'danger', text: `${r.errors.length + local.length} problem(s) found. See the red messages.` })
    } catch (e) { setMsg({ tone: 'danger', text: errorText(e, 'en') }) }
    setBusy(false)
  }
  const saveDraft = async () => {
    setBusy(true); setMsg(null)
    try {
      const created = await api.newRuleSet({ parent_id: set.id, params: p, rules })
      navigate(`/rules/${created.id}`)
    } catch (e) {
      setMsg({ tone: 'danger', text: errorText(e, 'en') })
      const d = (e as { details?: unknown }).details
      if (Array.isArray(d)) setProblems(d as Problem[])
    }
    setBusy(false)
  }
  const activate = async () => {
    setBusy(true)
    try { await api.activate(set.id); setConfirm(false); navigate('/rules') }
    catch (e) { setConfirm(false); setMsg({ tone: 'danger', text: errorText(e, 'en') }) }
    setBusy(false)
  }

  return (
    <div className="space-y-5">
      <button type="button" onClick={() => navigate('/rules')} className="inline-flex items-center gap-1 font-semibold text-brand min-h-[44px]"><Icon name="back" size={20} /> All versions</button>
      <PageHead title={`Rule version ${set.version}`} sub={set.checksum ? `checksum ${set.checksum}` : undefined}
        right={<Chip tone={set.status === 'active' ? 'auto' : set.status === 'draft' ? 'ask' : 'neutral'}>{set.status}</Chip>} />
      {!admin && <Notice icon="eye">You can read this version. Only an admin can change rules.</Notice>}
      {set.status !== 'draft' && admin && <Notice icon="info">This version is {set.status} and cannot be changed. If you save, a new draft is created from it.</Notice>}

      <fieldset disabled={!admin} className="space-y-5 disabled:opacity-90">
        <Card className="space-y-4">
          <h2>Settings</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Num label="Cutoff (poverty score)" path="params.cutoff" value={p.cutoff} onChange={(v) => setP({ ...p, cutoff: v })} err={err} />
            <Num label="Borderline band" path="params.borderline_band" value={p.borderline_band} onChange={(v) => setP({ ...p, borderline_band: v })} err={err} />
            <Num label="Amount (Rs)" path="params.amount" value={p.amount} onChange={(v) => setP({ ...p, amount: v })} err={err} />
            <Num label="Payout cap (Rs)" path="params.payout_cap" value={p.payout_cap} onChange={(v) => setP({ ...p, payout_cap: v })} err={err} />
            <Num label="Second approver above (Rs)" path="params.second_approver_over" value={p.second_approver_over} onChange={(v) => setP({ ...p, second_approver_over: v })} err={err} />
            <div>
              <span className="label">Automatic rejection</span>
              <button type="button" role="switch" aria-checked={p.auto_reject_enabled} onClick={() => setP({ ...p, auto_reject_enabled: !p.auto_reject_enabled })}
                className={`inline-flex items-center gap-3 min-h-[52px] rounded-xl border-2 px-4 font-semibold ${p.auto_reject_enabled ? 'border-danger bg-danger-soft text-danger' : 'border-line bg-white text-muted'}`}>
                <span className={`h-6 w-11 rounded-full p-0.5 transition-colors ${p.auto_reject_enabled ? 'bg-danger' : 'bg-line'}`}><span className={`block h-5 w-5 rounded-full bg-white transition-transform ${p.auto_reject_enabled ? 'translate-x-5 rtl:-translate-x-5' : ''}`} /></span>
                {p.auto_reject_enabled ? 'On' : 'Off (a person decides)'}
              </button>
            </div>
          </div>
          <h3>Costs of being wrong</h3>
          <div className="grid gap-4 sm:grid-cols-4">
            {(['wrong_approve', 'wrong_reject', 'review', 'proof'] as const).map((k) => (
              <Num key={k} label={{ wrong_approve: 'Wrong approval', wrong_reject: 'Wrong rejection', review: 'A person reviews', proof: 'Ask for proof' }[k]} path={`params.costs.${k}`} value={p.costs[k]} onChange={(v) => setCost(k, v)} err={err} />
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between"><h2>Rules ({rules.length})</h2>
            <Btn small variant="secondary" icon="plus" onClick={() => setRules([...rules, { code: 'NEW_RULE', expression: { '==': [{ var: 'doc.any_blurry' }, true] }, outcome: 'ASK_MORE', reason_code: 'R_DOC_BLURRY' }])}>Add a rule</Btn></div>
          <p className="text-sm text-muted">Each rule says: <b>if</b> the condition is true, <b>then</b> the outcome happens, with the chosen reason shown to the person.</p>
          {rules.map((r, i) => (
            <RuleRow key={i} i={i} r={r} err={err} onChange={(n) => setRules(rules.map((x, j) => (j === i ? n : x)))} onRemove={() => setRules(rules.filter((_, j) => j !== i))} />
          ))}
        </Card>
      </fieldset>

      {msg && <Notice tone={msg.tone} icon={msg.tone === 'auto' ? 'check' : 'warning'}>{msg.text}</Notice>}
      {local.length > 0 && <Notice tone="ask" icon="warning"><b>{local.length} thing(s) to fix before saving.</b> Look for the red messages.</Notice>}

      {admin && (
        <div className="flex flex-wrap gap-3 sticky bottom-3 bg-paper/90 backdrop-blur rounded-2xl p-2">
          <Btn variant="secondary" icon="check" disabled={busy} onClick={check}>Check</Btn>
          <Btn icon="copy" disabled={busy || local.length > 0 || (!dirty && set.status === 'draft')} onClick={saveDraft}>Save as new draft</Btn>
          {set.status === 'draft' && <Btn variant="secondary" icon="eye" onClick={() => navigate(`/twin?rs=${set.id}`)}>Preview with Digital Twin</Btn>}
          {set.status === 'draft' && <Btn variant="success" icon="check" disabled={busy || dirty} onClick={() => setConfirm(true)}>Make this version live</Btn>}
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-ink/50 p-4" role="dialog" aria-modal="true" aria-label="Confirm activation">
          <div className="w-full max-w-lg rounded-card bg-white p-6 space-y-4 shadow-card">
            <Icon name="warning" size={44} className="text-ask" />
            <h2>Make version {set.version} live?</h2>
            <p>From this moment every <b>new</b> decision uses version {set.version}. Version {active.data?.version ?? 'now live'} is retired. Past decisions are not changed. This is written to the diary with your name.</p>
            <p className="text-sm text-muted">Tip: run the Digital Twin first to see who would change.</p>
            <div className="flex flex-wrap gap-3 justify-end">
              <Btn variant="secondary" onClick={() => setConfirm(false)}>No, go back</Btn>
              <Btn variant="success" disabled={busy} onClick={activate}>Yes, make it live</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Num({ label, path, value, onChange, err }: { label: string; path: string; value: number; onChange: (v: number) => void; err: (p: string) => string | undefined }) {
  const e = err(path)
  return (
    <div>
      <label className="label" htmlFor={path}>{label}</label>
      <input id={path} className={`input ltr ${e ? 'border-danger' : ''}`} type="number" inputMode="decimal" value={Number.isFinite(value) ? value : ''} onChange={(ev) => onChange(ev.target.value === '' ? NaN : Number(ev.target.value))} aria-invalid={!!e} />
      {e && <p className="mt-1 text-sm text-danger font-semibold">{e}</p>}
    </div>
  )
}

function RuleRow({ i, r, err, onChange, onRemove }: { i: number; r: Rule; err: (p: string) => string | undefined; onChange: (r: Rule) => void; onRemove: () => void }) {
  const [advanced, setAdvanced] = useState(() => toSimple(r.expression) === null)
  const [text, setText] = useState(() => JSON.stringify(r.expression, null, 2))
  const [textErr, setTextErr] = useState('')
  const model = toSimple(r.expression)
  useEffect(() => { if (!advanced) setText(JSON.stringify(r.expression, null, 2)) }, [r.expression, advanced])

  const setModel = (m: SimpleModel) => onChange({ ...r, expression: fromSimple(m) })
  const setCond = (k: number, c: Cond) => model && setModel({ ...model, conds: model.conds.map((x, j) => (j === k ? c : x)) })
  const exprProblems = validateExpression(r.expression).map((x) => x.message)
  const base = `rules[${i}]`

  return (
    <div className="rounded-2xl border border-line bg-paper/60 p-4 space-y-3" data-testid="rule-row">
      <div className="grid gap-3 md:grid-cols-[1.2fr_0.7fr_1.6fr_auto] items-start">
        <div><label className="label">Name</label><input className="input ltr" value={r.code} onChange={(e) => onChange({ ...r, code: e.target.value })} aria-invalid={!!err(`${base}.code`)} />
          {err(`${base}.code`) && <p className="mt-1 text-sm text-danger font-semibold">{err(`${base}.code`)}</p>}</div>
        <div><label className="label">Then</label>
          <select className="input" value={r.outcome} onChange={(e) => onChange({ ...r, outcome: e.target.value as Rule['outcome'] })}>
            <option value="PASS">PASS</option><option value="HOLD">HOLD (send to a person)</option><option value="ASK_MORE">ASK_MORE (ask for proof)</option>
          </select></div>
        <div><label className="label">Reason shown to the person</label>
          <select className="input" value={r.reason_code} onChange={(e) => onChange({ ...r, reason_code: e.target.value })}>
            {reasonCodes.map((c) => <option key={c} value={c}>{c}: {allReasons[c].en.slice(0, 48)}</option>)}
          </select>
          {err(`${base}.reason_code`) && <p className="mt-1 text-sm text-danger font-semibold">{err(`${base}.reason_code`)}</p>}</div>
        <div className="pt-6"><Btn small variant="danger-outline" icon="trash" aria-label={`Remove rule ${r.code}`} onClick={onRemove} /></div>
      </div>

      {!advanced && model ? (
        <div className="space-y-2">
          <p className="label">If</p>
          {model.conds.map((c, k) => (
            <div key={k} className="grid gap-2 sm:grid-cols-[1.6fr_1fr_1fr_auto] items-center">
              <select className="input" aria-label="Variable" value={c.variable} onChange={(e) => setCond(k, { ...c, variable: e.target.value })}>
                {FACTS.map((f) => <option key={f.name} value={f.name}>{f.label}</option>)}
              </select>
              <select className="input" aria-label="Operator" value={c.op} onChange={(e) => setCond(k, { ...c, op: e.target.value as SimpleOp })}>
                {OPS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
              {c.op === 'missing' ? <span /> : <input className="input ltr" aria-label="Value" value={c.value} onChange={(e) => setCond(k, { ...c, value: e.target.value })} placeholder="true, 30, ..." />}
              <Btn small variant="ghost" aria-label="Remove condition" disabled={model.conds.length < 2} onClick={() => setModel({ ...model, conds: model.conds.filter((_, j) => j !== k) })}><Icon name="x" size={18} /></Btn>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <Btn small variant="secondary" icon="plus" onClick={() => setModel({ ...model, conds: [...model.conds, { variable: 'doc.any_blurry', op: '==', value: 'true' }] })}>Add a condition</Btn>
            {model.conds.length > 1 && (
              <select className="input w-auto min-h-[44px]" aria-label="Join" value={model.join} onChange={(e) => setModel({ ...model, join: e.target.value as 'and' | 'or' })}>
                <option value="and">All must be true (AND)</option><option value="or">Any can be true (OR)</option>
              </select>
            )}
          </div>
          <p className="text-sm text-muted">In words: {describe(r.expression)}</p>
        </div>
      ) : (
        <div>
          <label className="label">Technical condition (json-logic)</label>
          <textarea className="input ltr font-mono text-sm min-h-[110px] py-2" value={text} aria-invalid={!!textErr}
            onChange={(e) => {
              setText(e.target.value)
              try { onChange({ ...r, expression: JSON.parse(e.target.value) }); setTextErr('') } catch { setTextErr('This is not valid JSON yet.') }
            }} />
          {textErr && <p className="mt-1 text-sm text-danger font-semibold">{textErr}</p>}
        </div>
      )}
      {exprProblems.map((m) => <p key={m} className="text-sm text-danger font-semibold">{m}</p>)}
      <button type="button" className="text-sm font-semibold text-brand underline underline-offset-4 min-h-[36px]" onClick={() => { if (advanced && !model && !toSimple(r.expression)) return; setAdvanced((a) => !a) }}>
        {advanced ? (toSimple(r.expression) ? 'Use the simple form' : 'This rule is too complex for the form') : 'Edit the technical text'}
      </button>
    </div>
  )
}
