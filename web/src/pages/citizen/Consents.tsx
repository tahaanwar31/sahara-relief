// "My data": what I allowed, take it back with one big button, and who has seen my data.
import { useState } from 'react'
import { api, errorText } from '../../api'
import type { Consent } from '../../api/types'
import { Btn, Card, ConsentChip, ErrorBox, Notice, Spinner, fmtDate, fmtDateTime } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { SpeakButton } from '../../components/SpeakButton'
import { useAsync } from '../../components/useAsync'
import { useLang } from '../../i18n'
import { useAuth } from '../../auth/AuthContext'

export default function Consents() {
  const { t, lang } = useLang()
  const { user, family } = useAuth()
  const personId = user?.role === 'helper' ? family?.person_id : undefined
  const list = useAsync(() => api.consents(personId), [personId])
  const log = useAsync(() => api.accessLog(), [])
  const [confirm, setConfirm] = useState<Consent | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (user?.role === 'helper' && !family) {
    return <Card><h1>{t('consent.title')}</h1><Notice className="mt-4" tone="human" icon="people">{t('consent.helper_pick')}</Notice></Card>
  }

  const withdraw = async () => {
    if (!confirm) return
    setBusy(true); setError('')
    try { await api.withdrawConsent(confirm.id); setConfirm(null); list.reload(); log.reload() }
    catch (e) { setError(errorText(e, lang)) }
    setBusy(false)
  }
  const grantAgain = async () => {
    setBusy(true); setError('')
    try { await api.grantConsent({ grantee_type: 'office', purpose: 'claim', fields: ['name', 'cnic', 'household', 'account'], person_id: personId }); list.reload() }
    catch (e) { setError(errorText(e, lang)) }
    setBusy(false)
  }

  const items = list.data ?? []
  const anyActive = items.some((c) => c.status === 'granted')
  return (
    <div className="space-y-5">
      <Card className="space-y-3">
        <h1>{t('consent.title')}</h1>
        <SpeakButton promptKey="consents" text={t('prompt.consents')} />
        <p className="text-muted">{t('consent.sub')}</p>
      </Card>

      {list.loading ? <Spinner /> : list.error ? <ErrorBox error={list.error} onRetry={list.reload} /> : (
        <div className="space-y-3">
          {items.map((c) => (
            <Card key={c.id} className="space-y-3" >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-brand"><Icon name={c.grantee_type === 'helper' ? 'people' : c.grantee_type === 'service' ? 'bank' : 'person'} /></span>
                  <div>
                    <p className="font-bold text-lg">{t(`consent.who.${c.grantee_type}`)}</p>
                    {c.grantee_name && c.grantee_name !== c.grantee_type && <p className="ltr text-sm leading-6 text-muted">{c.grantee_name}</p>}
                    <p className="text-sm leading-6 text-muted">{t('consent.since', { date: fmtDate(c.granted_at, lang) })}</p>
                  </div>
                </div>
                <ConsentChip status={c.status} />
              </div>
              {c.fields?.length > 0 && <p className="text-sm text-muted">{t('consent.fields')}: {c.fields.map((f) => t(`field.${f}`)).join(', ')}</p>}
              {c.status === 'granted' && <Btn variant="danger" block icon="trash" onClick={() => setConfirm(c)}>{t('consent.withdraw')}</Btn>}
              {c.status === 'withdrawn' && c.withdrawn_at && <p className="text-sm text-danger font-semibold">{t('consent.withdrawn_on', { date: fmtDate(c.withdrawn_at, lang) })}</p>}
            </Card>
          ))}
          {!anyActive && <Btn block variant="success" icon="check" disabled={busy} onClick={grantAgain}>{t('consent.grant_again')}</Btn>}
        </div>
      )}
      {error && <Notice tone="danger" icon="warning">{error}</Notice>}

      <Card className="space-y-3">
        <h2 className="flex items-center gap-2"><Icon name="eye" /> {t('consent.log')}</h2>
        {log.loading ? <Spinner /> : log.error ? <p className="text-muted">{errorText(log.error, lang)}</p> : (log.data ?? []).length === 0 ? <p className="text-muted">{t('consent.log_empty')}</p> : (
          <ul className="divide-y divide-line">
            {(log.data ?? []).map((e) => (
              <li key={e.id} className="py-2.5">
                <p className="font-semibold">{e.who}</p>
                <p className="text-sm text-muted">{e.what}{e.purpose ? ` · ${e.purpose}` : ''}</p>
                <p className="text-xs text-muted ltr">{fmtDateTime(e.at)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {confirm && (
        <div className="fixed inset-0 z-40 grid place-items-end sm:place-items-center bg-ink/50 p-4" role="dialog" aria-modal="true" aria-label={t('consent.withdraw')}>
          <div className="w-full max-w-md rounded-card bg-white p-6 space-y-4 shadow-card">
            <Icon name="warning" size={44} className="text-danger" />
            <h2>{t('consent.confirm_title')}</h2>
            <p className="text-lg">{t('consent.confirm_text')}</p>
            <div className="grid gap-3">
              <Btn variant="danger" disabled={busy} onClick={withdraw}>{t('consent.confirm_yes')}</Btn>
              <Btn variant="secondary" onClick={() => setConfirm(null)}>{t('consent.confirm_no')}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
