// Admin: the list of rule versions, and "make a new draft from the active one". Officers and auditors can read.
import { useState } from 'react'
import { api, errorText } from '../../api'
import type { RuleSet } from '../../api/types'
import { Btn, Card, Chip, ErrorBox, Notice, PageHead, Spinner, fmtDateTime, money } from '../../components/ui'
import { useAsync } from '../../components/useAsync'
import { useAuth } from '../../auth/AuthContext'
import { navigate } from '../../router'

const tone = (s: string) => (s === 'active' ? 'auto' : s === 'draft' ? 'ask' : 'neutral') as 'auto' | 'ask' | 'neutral'

export default function Rules() {
  const { user } = useAuth()
  const sets = useAsync(() => api.ruleSets(), [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const admin = user?.role === 'admin'
  const active = sets.data?.find((s) => s.status === 'active')

  const makeDraft = async (from: RuleSet) => {
    setBusy(true); setError('')
    try {
      const full = await api.ruleSet(from.id)
      const created = await api.newRuleSet({ parent_id: from.id, params: full.params, rules: full.rules ?? [] })
      navigate(`/rules/${created.id}`)
    } catch (e) { setError(errorText(e, 'en')) }
    setBusy(false)
  }

  return (
    <div>
      <PageHead title="Rule versions" sub="Rules are never edited in place. A change makes a new draft. Only an admin can make a version live."
        right={admin && active ? <Btn icon="plus" disabled={busy} onClick={() => makeDraft(active)}>New draft from version {active.version}</Btn> : undefined} />
      {error && <Notice tone="danger" icon="warning" className="mb-4">{error}</Notice>}
      {sets.loading ? <Spinner /> : sets.error ? <ErrorBox error={sets.error} onRetry={sets.reload} /> : (
        <Card className="p-0 overflow-x-auto">
          <table className="tbl w-full min-w-[720px]" data-testid="rule-sets">
            <thead><tr><th>Version</th><th>Status</th><th>Cutoff</th><th>Amount</th><th>Payout cap</th><th>Auto-reject</th><th>Live from</th><th /></tr></thead>
            <tbody>
              {sets.data!.map((s) => (
                <tr key={s.id}>
                  <td className="font-bold">v{s.version}{s.parent_version ? <span className="text-muted font-normal text-sm"> (from v{s.parent_version})</span> : null}</td>
                  <td><Chip tone={tone(s.status)}>{s.status}</Chip></td>
                  <td className="ltr">{s.params.cutoff}</td>
                  <td className="ltr">{money(s.params.amount)}</td>
                  <td className="ltr">{money(s.params.payout_cap)}</td>
                  <td>{s.params.auto_reject_enabled ? 'on' : 'off'}</td>
                  <td className="text-sm text-muted ltr">{s.effective_from ? fmtDateTime(s.effective_from) : '-'}</td>
                  <td className="text-end whitespace-nowrap">
                    <Btn small variant="secondary" onClick={() => navigate(`/rules/${s.id}`)}>{admin ? 'Open' : 'View'}</Btn>{' '}
                    {admin && s.status === 'draft' && <Btn small variant="ghost" onClick={() => navigate(`/twin?rs=${s.id}`)}>Preview</Btn>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
