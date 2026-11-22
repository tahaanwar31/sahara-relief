// Continue on another phone: type the 6-digit resume code. No login is needed to look the code up;
// you still log in to carry on (the code only finds the saved step).
import { useState } from 'react'
import { api, errorText } from '../../api'
import { Btn, Notice } from '../../components/ui'
import { NumberPad } from '../../components/NumberPad'
import { SpeakButton } from '../../components/SpeakButton'
import { useLang } from '../../i18n'
import { useAuth } from '../../auth/AuthContext'
import { navigate } from '../../router'
import { saveLocalDraft } from '../../offline/runtime'

export default function Resume() {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const find = async () => {
    setBusy(true); setError('')
    try {
      const r = await api.resume(code)
      const step = Math.min(8, Math.max(1, r.step || 1))
      await saveLocalDraft({ caseId: r.case_id, step, draft: r.draft ?? {}, resume_code: code, savedAt: Date.now() })
      const target = `${user?.role === 'helper' ? '/helper/claim' : '/claim'}/${r.case_id}/${step}`
      navigate(user ? target : `/login?next=${encodeURIComponent(target)}`)
    } catch (e) {
      setError(errorText(e, lang))
      setCode('')
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-4">
        <h1>{t('resume.title')}</h1>
        <SpeakButton promptKey="resume" text={t('prompt.resume')} autoPlay />
        <p className="text-lg">{t('resume.help')}</p>
        <NumberPad value={code} onChange={setCode} maxLength={6} onEnter={() => code.length === 6 && find()} />
        {error && <Notice tone="danger" icon="warning">{error}</Notice>}
        <Btn block icon="check" disabled={code.length !== 6 || busy} onClick={find}>{busy ? t('common.wait') : t('resume.go')}</Btn>
      </div>
      {!user && <Btn variant="ghost" block onClick={() => navigate('/login')}>{t('login.button')}</Btn>}
    </div>
  )
}
