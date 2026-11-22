// Helper: the list of families, search by name or last 4 digits of the ID, one family at a time.
// The banner "You are helping: <name>" is drawn by the Layout while a session is open.
// A helper can start a claim and send it, but never approve a payment (there is no such button anywhere).
import { useMemo, useState, useEffect } from 'react'
import { api, errorText } from '../../api'
import type { Family } from '../../api/types'
import { Btn, Card, Chip, ConsentChip, ErrorBox, Notice, Spinner } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { SpeakButton } from '../../components/SpeakButton'
import { useAsync } from '../../components/useAsync'
import { useLang } from '../../i18n'
import { useAuth } from '../../auth/AuthContext'
import { navigate } from '../../router'

const statusTone = (s?: string | null) => (s === 'approved' || s === 'paid' ? 'auto' : s === 'awaiting_proof' ? 'ask' : s === 'in_review' ? 'human' : 'neutral') as 'auto' | 'ask' | 'human' | 'neutral'

export default function Families() {
  const { t, lang } = useLang()
  const { family, startFamily, endFamily } = useAuth()
  const fam = useAsync(() => api.families(), [], 10000)
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<Family | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [hid, setHid] = useState('')
  const [dob, setDob] = useState('')
  const [mem, setMem] = useState('')

  // a wrong answer: bring the reason into view inside the panel (the panel scrolls on a small phone)
  useEffect(() => { if (error) document.querySelector('[data-testid=verify-error]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }) }, [error])

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (fam.data ?? []).filter((f) => !s || f.name_roman.toLowerCase().includes(s) || (f.name_ur ?? '').includes(s) || f.cnic_last4.includes(s))
  }, [fam.data, q])

  const nameOf = (f: { name_roman: string; name_ur?: string }) => (lang === 'ur' && f.name_ur ? f.name_ur : f.name_roman)

  // start a session for this family, then the claim
  const begin = async (f: Family) => {
    setBusy(true); setError('')
    try {
      if (family && family.person_id !== f.person_id) await endFamily()
      await startFamily({ person_id: f.person_id, name_roman: f.name_roman, name_ur: f.name_ur })
      const c = await api.createCase(f.person_id)
      navigate(`/helper/claim/${c.id}/${c.status === 'draft' ? Math.max(1, c.step || 1) : 8}`)
    } catch (e) { setError(errorText(e, lang)) }
    setBusy(false)
  }
  // the family has not agreed yet: they agree in front of the helper
  const askConsent = async (f: Family) => {
    setBusy(true); setError('')
    try {
      // her PIN first (it records her permission), then the helper session can open
      await api.helperVerifyFamily({ cnic: hid, dob, members: Number(mem) })
      await api.helperSession(f.person_id)
      setHid(''); setDob(''); setMem('')
      fam.reload()
      setPicked({ ...f, consent_status: 'granted' })
    } catch (e) { setError(errorText(e, lang)) }
    setBusy(false)
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-3">
        <h1>{t('helper.title')}</h1>
        <SpeakButton promptKey="helper" text={t('prompt.helper')} />
        <div className="relative">
          <Icon name="search" className="absolute top-1/2 -translate-y-1/2 start-4 text-muted" />
          <input className="input ps-12" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('helper.search')} aria-label={t('helper.search')} inputMode="search" />
        </div>
      </Card>

      <Notice tone="human" icon="phone" data-testid="planned-safeguard">
        <b>{t('helper.planned_title')}</b>
        <span className="mt-1 block">{t('helper.planned_body')}</span>
      </Notice>

      {error && !picked && <Notice tone="danger" icon="warning">{error}</Notice>}
      {fam.loading ? <Spinner /> : fam.error ? <ErrorBox error={fam.error} onRetry={fam.reload} /> : (
        <ul className="space-y-3">
          {shown.map((f) => (
            <li key={f.person_id}>
              <button type="button" onClick={() => setPicked(f)} className="card w-full text-start flex items-center gap-4 hover:border-brand/50 hover:bg-brand-soft/30 transition-colors" data-testid="family">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand text-white text-xl font-bold">{f.name_roman.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xl font-bold truncate">{nameOf(f)}</span>
                  <span className="block text-sm text-muted ltr">ID •••• {f.cnic_last4}</span>
                  <span className="mt-1.5 flex flex-wrap gap-2"><ConsentChip status={f.consent_status} />{f.case_status && <Chip tone={statusTone(f.case_status)}>{t(`status.${f.case_status}`)}</Chip>}</span>
                </span>
                <Icon name={lang === 'ur' ? 'back' : 'fwd'} className="text-muted" />
              </button>
            </li>
          ))}
          {shown.length === 0 && <p className="text-center text-muted py-6">{t('helper.none')}</p>}
        </ul>
      )}

      {picked && (
        <div className="fixed inset-0 z-40 grid place-items-end sm:place-items-center bg-ink/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-card bg-white p-6 space-y-4 shadow-card">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-brand text-white text-xl font-bold">{picked.name_roman[0]}</span>
              <div>
                <h2>{nameOf(picked)}</h2>
                <ConsentChip status={picked.consent_status} />
              </div>
            </div>
            {picked.consent_status === 'granted' ? (
              <>
                <p className="text-lg">{t('helper.start_text')}</p>
                <Btn block icon="check" disabled={busy} onClick={() => begin(picked)}>{busy ? t('common.wait') : picked.case_id && picked.case_status && picked.case_status !== 'draft' ? t('helper.see_case') : t('helper.start')}</Btn>
              </>
            ) : (
              <>
                <Notice tone="ask" icon="lock">{t('helper.need_consent')}</Notice>
                <p className="text-lg">{t('helper.her_details')}</p>
                <label className="block space-y-1"><span className="block font-bold">{t('helper.f_cnic')}</span>
                  <input className="input text-center text-xl tracking-wider" inputMode="numeric" autoComplete="off" maxLength={13} value={hid} onChange={(e) => setHid(e.target.value.replace(/\D/g, ''))} data-testid="her-cnic" /></label>
                <label className="block space-y-1"><span className="block font-bold">{t('helper.f_dob')}</span>
                  <input className="input text-center text-xl" type="date" autoComplete="off" value={dob} onChange={(e) => setDob(e.target.value)} data-testid="her-dob" /></label>
                <label className="block space-y-1"><span className="block font-bold">{t('helper.f_members')}</span>
                  <input className="input text-center text-xl" inputMode="numeric" autoComplete="off" maxLength={2} value={mem} onChange={(e) => setMem(e.target.value.replace(/\D/g, ''))} data-testid="her-members" /></label>
                {error && <Notice tone="danger" icon="warning"><b data-testid="verify-error">{error}</b></Notice>}
                <Btn block variant="success" icon="check" disabled={busy || hid.length !== 13 || !dob || !mem} onClick={() => askConsent(picked)}>{busy ? t('common.wait') : t('helper.family_agrees')}</Btn>
              </>
            )}
            <Btn block variant="secondary" onClick={() => { setPicked(null); setError('') }}>{t('common.cancel')}</Btn>
          </div>
        </div>
      )}
    </div>
  )
}
