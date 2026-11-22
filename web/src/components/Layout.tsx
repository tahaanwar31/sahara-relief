// The frame around every screen: banner, top bar, language switch, signal pill, role navigation.
import { clearTourFlags } from './Tutorial'
import { useEffect, useState, type ReactNode } from 'react'
import { Icon } from './Icon'
import { SyntheticBanner, Btn } from './ui'
import { useLang } from '../i18n'
import { useAuth } from '../auth/AuthContext'
import { NAV, isStaff } from '../auth/roles'
import { usePath, navigate } from '../router'
import { StaffTranslator } from './StaffTranslator'
import { useOnline, useOutbox } from '../offline/runtime'
import { api } from '../api'

export function LangToggle() {
  const { lang, setLang } = useLang()
  return (
    <div role="group" aria-label="Language" className="inline-flex rounded-full border border-line bg-white p-0.5 text-sm font-semibold">
      {(['ur', 'en'] as const).map((l) => (
        <button
          key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}
          className={`rounded-full px-3 min-h-[36px] transition-colors ${lang === l ? 'bg-brand text-white' : 'text-muted hover:bg-brand-soft'}`}
        >
          {l === 'ur' ? 'اردو' : 'EN'}
        </button>
      ))}
    </div>
  )
}

export function SignalPill() {
  const online = useOnline()
  const { count } = useOutbox()
  const t = useLang().t
  return (
    <div className="flex items-center gap-2" data-testid="signal">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold border ${online ? 'bg-auto-soft text-auto border-auto/25' : 'bg-ask-soft text-ask border-ask/30'}`}
        role="status" data-online={online ? '1' : '0'}
      >
        <Icon name={online ? 'wifi' : 'wifioff'} size={16} />
        {online ? t('net.online') : t('net.offline')}
      </span>
      {count > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold border bg-human-soft text-human border-human/25" data-testid="outbox-count">
          <Icon name="upload" size={16} />
          {t('net.waiting', { n: count })}
        </span>
      )}
    </div>
  )
}

/** The helper must always know whose data is on screen. */
function HelperBanner() {
  const { family, endFamily } = useAuth()
  const { lang, t } = useLang()
  if (!family) return null
  const name = lang === 'ur' && family.name_ur ? family.name_ur : family.name_roman
  return (
    <div className="bg-human text-white" role="status" data-testid="helper-banner">
      <div className="mx-auto max-w-3xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Icon name="people" /> <span>{t('helper.helping')} <span data-testid="helping-name">{name}</span></span>
        </div>
        <button
          type="button" onClick={async () => { await endFamily(); navigate('/helper') }}
          className="rounded-xl bg-white text-human font-bold px-4 min-h-[44px] hover:bg-human-soft"
        >
          {t('helper.end')}
        </button>
      </div>
    </div>
  )
}

/** After 60 seconds with no touch the helper's screen is covered, so the family's details are not left open. */
function IdleLock({ seconds = 60 }: { seconds?: number }) {
  const { family } = useAuth()
  const t = useLang().t
  const [locked, setLocked] = useState(false)
  useEffect(() => {
    if (!family) { setLocked(false); return }
    let timer = setTimeout(() => setLocked(true), seconds * 1000)
    const reset = () => { if (!locked) { clearTimeout(timer); timer = setTimeout(() => setLocked(true), seconds * 1000) } }
    const ev = ['pointerdown', 'keydown', 'touchstart']
    ev.forEach((e) => window.addEventListener(e, reset))
    return () => { clearTimeout(timer); ev.forEach((e) => window.removeEventListener(e, reset)) }
  }, [family, locked, seconds])
  if (!locked || !family) return null
  return (
    <div className="fixed inset-0 z-50 bg-paper flex items-center justify-center p-6 text-center">
      <div>
        <Icon name="lock" size={56} className="mx-auto text-brand" />
        <h2 className="mt-4">{t('helper.locked')}</h2>
        <Btn className="mt-6" onClick={() => setLocked(false)}>{t('helper.unlock')}</Btn>
      </div>
    </div>
  )
}

/** Demo helper: a small, quiet control that closes the current claim so the registration can be shown again. */
function RestartClaim() {
  const [busy, setBusy] = useState(false)
  return (
    <button type="button" disabled={busy} data-testid="restart-claim" aria-label="Start a new claim (demo)" title="Start over"
      onClick={async () => {
        setBusy(true)
        clearTourFlags()
        try { await api.restartClaim() } catch { /* the control is switched off or the signal is down: nothing to do */ }
        setBusy(false)
        navigate('/claim')
        window.location.reload()
      }}
      className="grid h-8 w-8 place-items-center rounded-full text-muted/40 hover:text-muted hover:bg-white transition-colors">
      <Icon name="refresh" size={15} />
    </button>
  )
}

/** Demo helper (for the helper): puts everything he changed back to the start and returns him to his lobby. */
function ResetHelper() {
  const [busy, setBusy] = useState(false)
  return (
    <button type="button" disabled={busy} data-testid="reset-helper" aria-label="Reset the demo (helper)" title="Reset everything and go back to the lobby"
      onClick={async () => {
        setBusy(true)
        try { await api.resetHelper() } catch { /* the control is switched off or the signal is down: nothing to do */ }
        setBusy(false)
        navigate('/helper')
        window.location.reload()
      }}
      className="grid h-8 w-8 place-items-center rounded-full text-muted/40 hover:text-muted hover:bg-white transition-colors">
      <Icon name="refresh" size={15} />
    </button>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const { t } = useLang()
  const path = usePath()
  const staff = isStaff(user?.role)
  const nav = user ? NAV[user.role] : []
  const active = (to: string) => path === to || path.startsWith(to + '/') || (to === '/helper' && path.startsWith('/helper'))

  return (
    <div className="min-h-screen flex flex-col">
      {staff && <StaffTranslator />}
      <header className="sticky top-0 z-30 bg-paper/80 backdrop-blur-xl">
        <div className={`mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 ${staff ? 'max-w-6xl' : 'max-w-3xl'}`}>
          <div className="flex items-center gap-2.5 font-bold text-brand text-lg">
            <span className="grid h-10 w-10 place-items-center rounded-[14px] text-white shadow-lift" style={{ background: '#2B2420' }}><Icon name="shield" size={20} /></span>
            <span>{t('app.name')}</span>
          </div>
          <div className="flex items-center gap-3">
            <SignalPill />
            <LangToggle />
            {user?.role === 'citizen' && <RestartClaim />}
            {user?.role === 'helper' && <ResetHelper />}
            {user && (
              <button type="button" onClick={() => { void logout().then(() => navigate('/login')) }} className="inline-flex items-center gap-1.5 rounded-full px-3 min-h-[40px] text-sm font-semibold text-muted hover:bg-danger-soft hover:text-danger" aria-label={t('nav.logout')}>
                <Icon name="logout" size={18} /> <span className="hidden sm:inline">{t('nav.logout')}</span>
              </button>
            )}
          </div>
        </div>
        {staff && user && (
          <nav aria-label="Main" className="mx-auto max-w-6xl px-4 flex gap-1 overflow-x-auto">
            {nav.map((n) => (
              <a key={n.to} href={'#' + n.to} aria-current={active(n.to) ? 'page' : undefined}
                className={`my-2 inline-flex items-center gap-2 rounded-full px-4 min-h-[40px] text-[15px] font-semibold whitespace-nowrap transition-colors ${active(n.to) ? 'bg-ink text-white' : 'text-muted hover:bg-white hover:text-ink'}`}>
                <Icon name={n.icon} size={20} /> {t(n.label)}
              </a>
            ))}
          </nav>
        )}
      </header>
      <HelperBanner />
      <IdleLock />
      <main className={`mx-auto w-full flex-1 px-4 py-6 ${staff ? 'max-w-6xl' : 'max-w-xl pb-28'}`}>{children}</main>
      <div className={staff ? '' : 'pb-24'}><SyntheticBanner /></div>
      {!staff && user && (
        <nav aria-label="Main" className="fixed bottom-4 inset-x-4 z-30 mx-auto max-w-sm rounded-[26px] border border-line bg-white/95 shadow-pop backdrop-blur-xl">
          <div className="grid p-1.5" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
            {nav.map((n) => (
              <a key={n.to} href={'#' + n.to} aria-current={active(n.to) ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-[20px] py-2 min-h-[58px] text-[12px] font-semibold transition-colors ${active(n.to) ? 'bg-brand-soft text-brand-dark' : 'text-muted hover:bg-paper'}`}>
                <Icon name={n.icon} size={24} /> {t(n.label)}
              </a>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
