// Login. Families and helpers: email + 6-digit PIN pad. Staff: email + password.
// The test-user quick buttons only appear in mock / dev mode.
import { useState } from 'react'
import { Btn, Notice, SyntheticBanner } from '../components/ui'
import { Icon } from '../components/Icon'
import { LangToggle, SignalPill } from '../components/Layout'
import { NumberPad } from '../components/NumberPad'
import { SpeakButton } from '../components/SpeakButton'
import { useLang } from '../i18n'
import { useAuth } from '../auth/AuthContext'
import { homeFor } from '../auth/roles'
import { currentQuery, navigate } from '../router'
import { errorText, IS_DEV_UI, API_MODE } from '../api'

const TEST_USERS = [
  { email: 'zainab@citizens.sahara.test', secret: '246810', label: 'Zainab Bibi (citizen)', role: 'citizen' },
  { email: 'yousuf@helpers.sahara.test', secret: '246810', label: 'Yousuf (helper)', role: 'helper' },
  { email: 'admin1@gov.sahara.test', secret: 'Admin#2026', label: 'Admin', role: 'admin' },
]

export default function Login({ expired }: { expired?: boolean }) {
  const { t, lang, setLang } = useLang()
  const { login } = useAuth()
  const [mode, setMode] = useState<'pin' | 'staff'>('pin')
  const [email, setEmail] = useState('')
  const [secret, setSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const go = async (e: string, s: string) => {
    setBusy(true); setError('')
    try {
      const u = await login(e, s)
      // families and helpers start in Urdu; staff in English
      setLang(u.language ?? (u.role === 'citizen' || u.role === 'helper' ? 'ur' : 'en'))
      const next = currentQuery().get('next')
      navigate(next || homeFor(u.role))
    } catch (err) {
      setError(errorText(err, lang))
      setSecret('')
    } finally { setBusy(false) }
  }

  const demoBlock = (dark: boolean) => (
        
          <div className={dark ? 'relative mt-7 rounded-3xl bg-white/10 p-4' : 'mb-3 card !p-3 bg-white/70 border-dashed lg:hidden'} data-testid="test-users">
            <p className={`text-sm font-semibold mb-2 ${dark ? 'text-white/70' : 'text-muted'}`}>Demo accounts: one tap to log in (all fake data)</p>
            <div className="flex flex-wrap gap-2">
              {TEST_USERS.map((u) => (
                <button key={u.email} type="button" disabled={busy} onClick={() => go(u.email, u.secret)}
                  className={dark ? 'rounded-full bg-white/10 px-3 min-h-[36px] text-sm font-semibold text-white hover:bg-white/20' : 'rounded-full border border-line bg-white px-3 min-h-[40px] text-sm font-semibold hover:bg-brand-soft hover:border-brand/40'}>
                  {u.label}
                </button>
              ))}
            </div>
            {API_MODE === 'mock' && (
              <button type="button" className="mt-3 text-sm text-muted underline" onClick={async () => { (await import('../api/mock')).resetMock(); location.reload() }}>Reset the demo data</button>
            )}
          </div>
        
  )

  const ready = mode === 'pin' ? email.includes('@') && secret.length === 6 : email.includes('@') && secret.length > 3

  return (
    <div className="min-h-screen flex items-center">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 lg:py-6 grid lg:grid-cols-[1.05fr_1fr] gap-10 items-center">
        <aside className="hidden lg:block relative overflow-hidden rounded-[28px] p-[clamp(18px,3.6vh,40px)] text-white" style={{ background: '#2B2420' }}>
          <div className="absolute -top-24 -end-24 h-80 w-80 rounded-full bg-white/[.06]" aria-hidden />
          <div className="absolute -bottom-32 -start-16 h-72 w-72 rounded-full bg-[#E2693B]/30" aria-hidden />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold tracking-wide">{t('app.name')}</span>
            <h2 className="mt-[clamp(8px,2vh,20px)] text-[clamp(30px,5.4vh,48px)] font-bold leading-[1.1] tracking-tight">{t('login.hero.title')}</h2>
            <p className="mt-[clamp(8px,2vh,20px)] text-[clamp(16px,2.4vh,20px)] text-white/75 max-w-md">{t('login.hero.sub')}</p>
            <ul className="mt-[clamp(10px,2.4vh,28px)] space-y-[clamp(6px,1.4vh,14px)] text-[clamp(15px,2.2vh,18px)]">
              {['login.hero.b1', 'login.hero.b2', 'login.hero.b3'].map((k) => (
                <li key={k} className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-white"><Icon name="check" size={20} stroke={3} /></span>{t(k)}
                </li>
              ))}
            </ul>
          </div>
          {demoBlock(true)}
        </aside>
        <div className="w-full max-w-[480px] mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 font-bold text-brand text-xl">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white"><Icon name="shield" /></span>
            {t('app.name')}
          </div>
          <div className="flex items-center gap-2"><SignalPill /><LangToggle /></div>
        </div>

        {/* phones: the demo accounts sit above the form (on a computer they are in the dark panel on the left) */}
        {demoBlock(false)}

        <div className="card !p-[clamp(14px,2.4vh,20px)]">
          <div className="flex items-start justify-between gap-3">
            <div><h1 className="!text-2xl">{t('login.title')}</h1><p className="text-muted text-base">{t('login.sub')}</p></div>
            <SpeakButton className="shrink-0 whitespace-nowrap" promptKey="login" text={t('prompt.login')} />
          </div>

          {expired && <Notice tone="ask" icon="clock" className="mt-4">{t('login.expired')}</Notice>}

          <div className="mt-3 grid grid-cols-2 gap-2" role="tablist">
            {(['pin', 'staff'] as const).map((m) => (
              <button key={m} role="tab" aria-selected={mode === m} type="button" onClick={() => { setMode(m); setSecret(''); setError('') }}
                className={`rounded-xl min-h-[clamp(36px,5vh,44px)] font-semibold border transition-colors ${mode === m ? 'bg-brand text-white border-brand' : 'bg-white border-line text-muted hover:bg-brand-soft'}`}>
                {t(m === 'pin' ? 'login.tab.pin' : 'login.tab.staff')}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <label className="label" htmlFor="email">{t('login.email')}</label>
            <input id="email" className="input ltr !min-h-[clamp(38px,5.4vh,54px)]" type="email" inputMode="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.test" />
          </div>

          {mode === 'pin' ? (
            <div className="mt-3">
              <p className="label text-center">{t('login.pin')}</p>
              <NumberPad value={secret} onChange={setSecret} maxLength={6} mask onEnter={() => ready && go(email, secret)} />
            </div>
          ) : (
            <div className="mt-4">
              <label className="label" htmlFor="pw">{t('login.password')}</label>
              <input id="pw" className="input ltr" type="password" autoComplete="current-password" value={secret} onChange={(e) => setSecret(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && ready && go(email, secret)} />
            </div>
          )}

          {error && <Notice tone="danger" icon="warning" className="mt-4">{error}</Notice>}

          <Btn className="mt-3 !min-h-[clamp(42px,6vh,56px)]" block disabled={!ready || busy} onClick={() => go(email, secret)} icon="check">
            {busy ? t('common.wait') : t('login.button')}
          </Btn>
          <a href="#/resume" className="mt-1 block text-center font-semibold text-brand underline underline-offset-4 min-h-[36px] leading-[36px]">{t('login.resume')}</a>
        </div>

        </div>
      </div>
      <SyntheticBanner />
    </div>
  )
}
