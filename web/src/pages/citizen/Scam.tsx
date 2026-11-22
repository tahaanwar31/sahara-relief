// "Is this message real?"  Paste or forward the text. Green / yellow / red, with reasons and advice.
// It only warns. It never blocks anything.
import { useState } from 'react'
import { api, errorText } from '../../api'
import type { ScamResult } from '../../api/types'
import { Btn, Notice, Chip } from '../../components/ui'
import { Icon, type IconName } from '../../components/Icon'
import { SpeakButton } from '../../components/SpeakButton'
import { useLang } from '../../i18n'
import { scamText } from '../../data/reasons'

const LOOK = {
  safe: { icon: 'check' as IconName, box: 'bg-auto-soft border-auto/40 text-auto' },
  suspicious: { icon: 'warning' as IconName, box: 'bg-ask-soft border-ask/40 text-ask' },
  scam: { icon: 'x' as IconName, box: 'bg-danger-soft border-danger/40 text-danger' },
}

export default function Scam() {
  const { t, lang } = useLang()
  const [text, setText] = useState('')
  const [sender, setSender] = useState('')
  const [res, setRes] = useState<ScamResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [reported, setReported] = useState(false)

  const check = async () => {
    setBusy(true); setError(''); setReported(false)
    try { setRes(await api.scamCheck(text, sender)) } catch (e) { setError(errorText(e, lang)); setRes(null) }
    setBusy(false)
  }
  const paste = async () => {
    try { setText(await navigator.clipboard.readText()) } catch { /* the browser said no: the user can paste by hand */ }
  }

  const look = res ? LOOK[res.label] : null
  return (
    <div className="space-y-5">
      <div className="card space-y-4">
        <h1>{t('scam.title')}</h1>
        <SpeakButton promptKey="scam" text={t('prompt.scam')} />
        <div>
          <label className="label" htmlFor="msg">{t('scam.paste')}</label>
          <textarea id="msg" className="input min-h-[140px] py-3" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('scam.placeholder')} />
          <div className="mt-2 flex gap-2">
            <Btn small variant="secondary" icon="copy" onClick={paste}>{t('scam.pastebtn')}</Btn>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="sender">{t('scam.sender')}</label>
          <input id="sender" className="input ltr" inputMode="text" value={sender} onChange={(e) => setSender(e.target.value)} placeholder="9171" />
        </div>
        {error && <Notice tone="danger" icon="warning">{error}</Notice>}
        <Btn block icon="shield" disabled={text.trim().length < 3 || busy} onClick={check}>{busy ? t('common.wait') : t('scam.check')}</Btn>
      </div>

      {res && look && (
        <div className="space-y-4" data-testid="scam-result" data-label={res.label}>
          <div className={`rounded-card border-2 p-6 text-center ${look.box}`}>
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-white shadow-card"><Icon name={look.icon} size={56} stroke={2.4} /></div>
            <h2 className="mt-3 text-2xl">{t(`scam.${res.label}`)}</h2>
            <p className="mt-2 text-xl text-ink">{lang === 'ur' ? res.advice.ur : res.advice.en}</p>
          </div>
          <SpeakButton promptKey={`scam_${res.label}`} text={`${t(`scam.${res.label}`)}. ${lang === 'ur' ? res.advice.ur : res.advice.en}`} autoPlay />
          {res.reasons.length > 0 && (
            <div className="card">
              <h3 className="mb-2">{t('scam.why')}</h3>
              <ul className="space-y-2">
                {res.reasons.map((r) => (
                  <li key={r.code} className="flex gap-3 items-start">
                    <Icon name={r.code === 'OFFICIAL_SENDER' ? 'check' : 'warning'} className={r.code === 'OFFICIAL_SENDER' ? 'text-auto' : 'text-ask'} />
                    <span>{scamText(r.code, lang, r)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {res.label !== 'safe' && (
            <div className="flex items-center gap-3">
              <Btn variant="secondary" disabled={reported} onClick={() => { api.scamReport(text, sender).then(() => setReported(true)).catch(() => {}) }}>{t('scam.report')}</Btn>
              {reported && <Chip tone="auto" icon="check">{t('scam.reported')}</Chip>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
