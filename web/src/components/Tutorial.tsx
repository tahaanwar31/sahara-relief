// "Watch first, then you do it": a short practice demo before a claim page, like a game tutorial.
// It plays on its OWN practice card with FAKE details (a mock number pad and mock buttons), with a voice in the chosen language.
// It never touches the real page, never fills her real boxes, never moves her to the next page and sends nothing to the service.
// When it ends she presses "Now I will do it" and enters her own details herself.
import { useEffect, useMemo, useState } from 'react'
import { Btn } from './ui'
import { Icon } from './Icon'
import { SpeakButton } from './SpeakButton'
import { formatCnic } from './NumberPad'
import { useLang } from '../i18n'
import { useAuth } from '../auth/AuthContext'

export const TOUR_STEPS = [2, 3, 4, 5, 6, 7] as const
const PREFIX = 'sahara.tour.v1.'
export const tourKey = (userId: string, step: number) => `${PREFIX}${userId}.${step}`
export function clearTourFlags() {
  try { Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k)) } catch { /* ignore */ }
}
const seen = (userId: string, step: number) => { try { return localStorage.getItem(tourKey(userId, step)) === '1' } catch { return true } }
const markSeen = (userId: string, step: number) => { try { localStorage.setItem(tourKey(userId, step), '1') } catch { /* ignore */ } }

/** Will the demo show on this page for this person right now? */
export function tourPending(user: { id: string; role: string } | null, family: unknown, step: number): boolean {
  const resend = typeof location !== 'undefined' && location.hash.includes('redo=1')
  return !!user && user.role === 'citizen' && !family && !resend && (TOUR_STEPS as readonly number[]).includes(step) && !seen(user.id, step)
}

interface Frame { ms: number; typed?: string; hand?: string; pressed?: string; name?: boolean; done?: boolean; photo?: 'front' | 'back' }
const FAKE_CNIC = '4210112345671'   // clearly made up, not anyone's number
const FAKE_ACCOUNT = '03001234567'  // clearly made up

/** The timeline of the demo for each page. */
function frames(step: number): Frame[] {
  if (step === 2) return [{ ms: 1800 }, { ms: 1400, hand: 'agree' }, { ms: 1600, hand: 'agree', pressed: 'agree' }, { ms: 0, done: true }]
  if (step === 3) {
    const f: Frame[] = [{ ms: 1500 }]
    for (let i = 1; i <= FAKE_CNIC.length; i++) f.push({ ms: 330, typed: FAKE_CNIC.slice(0, i), hand: FAKE_CNIC[i - 1] })
    f.push({ ms: 1200, typed: FAKE_CNIC, hand: 'find' }, { ms: 1000, typed: FAKE_CNIC, hand: 'find', pressed: 'find' },
      { ms: 1800, typed: FAKE_CNIC, name: true }, { ms: 1400, typed: FAKE_CNIC, name: true, hand: 'yes' }, { ms: 1400, typed: FAKE_CNIC, name: true, hand: 'yes', pressed: 'yes' }, { ms: 0, done: true, typed: FAKE_CNIC, name: true })
    return f
  }
  if (step === 5) return [{ ms: 1500 }, { ms: 1200, hand: 'camera' }, { ms: 1000, hand: 'camera', pressed: 'camera' }, { ms: 2000, photo: 'front' },
    { ms: 1500, photo: 'front', hand: 'camera' }, { ms: 1000, photo: 'back', hand: 'camera', pressed: 'camera' }, { ms: 2000, photo: 'back' }, { ms: 0, done: true, photo: 'back' }]
  if (step === 6) {
    const f: Frame[] = [{ ms: 1500 }]
    for (let i = 1; i <= FAKE_ACCOUNT.length; i++) f.push({ ms: 330, typed: FAKE_ACCOUNT.slice(0, i), hand: FAKE_ACCOUNT[i - 1] })
    f.push({ ms: 1300, typed: FAKE_ACCOUNT, hand: 'continue' }, { ms: 1500, typed: FAKE_ACCOUNT, hand: 'continue', pressed: 'continue' }, { ms: 0, done: true, typed: FAKE_ACCOUNT })
    return f
  }
  if (step === 7) return [{ ms: 2500 }, { ms: 1600, hand: 'send' }, { ms: 1600, hand: 'send', pressed: 'send' }, { ms: 0, done: true }]
  return [{ ms: 1500 }, { ms: 700, typed: '4', hand: '4' }, { ms: 1300, typed: '4', hand: 'check' }, { ms: 1500, typed: '4', hand: 'check', pressed: 'check' }, { ms: 0, done: true, typed: '4' }]
}

const URDU: Record<string, string> = { '0': 'صفر', '1': 'ایک', '2': 'دو', '3': 'تین', '4': 'چار', '5': 'پانچ', '6': 'چھ', '7': 'سات', '8': 'آٹھ', '9': 'نو' }

function Finger() {
  return (
    <span className="pointer-events-none absolute -bottom-3 end-1 z-10 animate-bounce text-ink drop-shadow" aria-hidden="true">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="#fff" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M9 11V5a1.5 1.5 0 013 0v5l4 .8a2 2 0 011.6 2L17 18a3 3 0 01-3 3H11a3 3 0 01-2.5-1.3L5 15.5a1.5 1.5 0 012.3-1.9L9 15z" /></svg>
    </span>
  )
}

function MockButton({ id, label, frame, tone = 'primary' }: { id: string; label: string; frame: Frame; tone?: 'primary' | 'success' }) {
  const pressed = frame.pressed === id
  return (
    <div className="relative">
      <div className={`flex min-h-[52px] items-center justify-center rounded-2xl px-4 text-lg font-bold text-white transition-transform ${tone === 'success' ? 'bg-auto' : 'bg-brand'} ${pressed ? 'scale-95 ring-4 ring-brand/30' : ''} ${frame.hand === id ? 'ring-4 ring-brand/40' : ''}`}>{label}</div>
      {frame.hand === id && <Finger />}
    </div>
  )
}

function MockPad({ frame, max, format }: { frame: Frame; max: number; format?: (v: string) => string }) {
  const typed = frame.typed ?? ''
  const shown = format ? format(typed) : typed
  return (
    <div className="mx-auto w-full max-w-[250px]">
      <div className="ltr mb-2 flex min-h-[40px] items-center justify-center">
        <span className="rounded-2xl bg-white px-4 py-1.5 text-xl font-semibold tracking-widest shadow-card">{shown || <span className="text-muted/50">{'_'.repeat(Math.min(max, 6))}</span>}</span>
      </div>
      <div className="ltr grid grid-cols-3 gap-1.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''].map((d, i) => d === '' ? <span key={i} /> : (
          <div key={i} className="relative">
            <div className={`mx-auto flex h-11 w-11 flex-col items-center justify-center rounded-full bg-white ring-1 ring-black/5 shadow-card transition ${frame.hand === d ? 'scale-90 bg-brand-soft ring-2 ring-brand' : ''}`}>
              <span className="text-lg font-semibold leading-none">{d}</span>
              <span className="font-urdu text-[9px] leading-none text-muted">{URDU[d]}</span>
            </div>
            {frame.hand === d && <Finger />}
          </div>
        ))}
      </div>
    </div>
  )
}

export function Tutorial({ step, onOpenChange }: { step: number; onOpenChange?: (open: boolean) => void }) {
  const { t, lang } = useLang()
  const { user, family } = useAuth()
  const resend = typeof location !== 'undefined' && location.hash.includes('redo=1')     // the one-click resend: no demo
  const eligible = !!user && user.role === 'citizen' && !family && !resend && (TOUR_STEPS as readonly number[]).includes(step)
  const [open, setOpen] = useState(() => eligible && !seen(user!.id, step))
  const [run, setRun] = useState(0)          // changes when she watches again
  const [i, setI] = useState(0)
  const list = useMemo(() => frames(step), [step])
  useEffect(() => { onOpenChange?.(open) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setOpen(eligible && !seen(user!.id, step)); setI(0) }, [step, eligible, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return
    setI(0)
    let n = 0; let timer: ReturnType<typeof setTimeout>
    const next = () => { const cur = list[n]; if (!cur || cur.done) return; timer = setTimeout(() => { n += 1; setI(n); next() }, cur.ms) }
    next()
    return () => clearTimeout(timer)
  }, [open, run, list])

  const close = () => { if (user) markSeen(user.id, step); setOpen(false) }
  if (!eligible) return null
  if (!open) {
    return (
      <button type="button" onClick={() => { setRun((r) => r + 1); setOpen(true) }} data-testid="tour-replay" aria-label={t('tour.replay')}
        className="fixed bottom-24 end-4 z-30 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-brand shadow-card ring-1 ring-brand/30">
        <Icon name="help" size={20} /> {t('tour.replay')}
      </button>
    )
  }
  const f = list[Math.min(i, list.length - 1)]
  const done = !!f.done
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4" role="dialog" aria-modal="true" aria-label={t('tour.title')} data-testid="tour">
      <div className="max-h-[96vh] w-full max-w-sm space-y-3 overflow-y-auto rounded-[26px] bg-paper p-5 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold">{t('tour.title')}</h2>
          <span className="rounded-full bg-ask-soft px-3 py-1 text-xs font-bold text-ask" data-testid="tour-badge">{t('tour.badge')}</span>
        </div>
        <SpeakButton bar autoPlay key={`${step}-${run}-${lang}`} promptKey={`demo_${step}`} text={t(`prompt.demo_${step}`)} />
        <p className="rounded-xl bg-white p-3 text-lg leading-relaxed" data-testid="tour-caption">{t(`prompt.demo_${step}`)}</p>

        {/* the practice card */}
        <div className="space-y-3 rounded-2xl border-2 border-dashed border-brand/40 bg-white/60 p-3" aria-hidden="true">
          {step === 2 && (
            <>
              {[['person', 'step.2.see_office'], ['people', 'step.2.see_helper'], ['bank', 'step.2.see_bank']].map(([icon, k]) => (
                <div key={k} className="flex items-center gap-2 rounded-xl bg-paper p-2 text-sm"><Icon name={icon as 'person'} size={20} className="text-brand" /> {t(k)}</div>
              ))}
              <MockButton id="agree" label={t('step.2.allow')} frame={f} tone="success" />
            </>
          )}
          {step === 3 && (
            <>
              <MockPad frame={f} max={13} format={formatCnic} />
              <MockButton id="find" label={t('step.3.find')} frame={f} />
              {f.name && (
                <div className="space-y-2 rounded-xl bg-auto-soft p-2 text-center">
                  <p className="font-bold">{lang === 'ur' ? 'نمونہ نام' : 'Sample Name'}</p>
                  <MockButton id="yes" label={t('common.yes')} frame={f} tone="success" />
                </div>
              )}
            </>
          )}
          {step === 4 && (
            <>
              <MockPad frame={f} max={2} />
              <MockButton id="check" label={t('step.4.check')} frame={f} />
            </>
          )}
          {step === 5 && (
            <>
              <div className="rounded-xl bg-brand-soft p-3 text-center">
                <Icon name="doc" size={32} className="mx-auto text-brand" />
                <p className="mt-1 font-semibold">{t(f.photo === 'front' ? 'doc.cnic_back.ask' : 'doc.cnic_front.ask')}</p>
              </div>
              {f.photo && (
                <div className="space-y-1">
                  <div className="mx-auto h-16 w-28 rounded-lg border bg-white p-1.5"><div className="h-2 w-10 rounded bg-ink/20" /><div className="mt-1 h-1.5 w-16 rounded bg-ink/10" /><div className="mt-1 h-1.5 w-12 rounded bg-ink/10" /></div>
                  <p className="rounded-xl bg-auto-soft p-2 text-center text-sm font-bold text-auto">{t('docs.ok')}</p>
                </div>
              )}
              <MockButton id="camera" label={t('docs.camera')} frame={f} />
              <div className="rounded-xl border-2 border-line bg-white py-2 text-center text-sm font-bold">{t('docs.gallery')}</div>
            </>
          )}
          {step === 6 && (
            <>
              <MockPad frame={f} max={11} format={(v) => [v.slice(0, 4), v.slice(4)].filter(Boolean).join('-')} />
              <MockButton id="continue" label={t('step.6.check')} frame={f} />
            </>
          )}
          {step === 7 && (
            <>
              {[['person', lang === 'ur' ? 'نمونہ نام' : 'Sample Name'], ['people', t('step.4.members', { n: 4 })], ['doc', t('step.7.docs', { n: 2 })], ['bank', t('step.7.account_given')]].map(([icon, text]) => (
                <div key={icon} className="flex items-center gap-2 rounded-xl bg-paper p-2 text-sm font-semibold"><Icon name={icon as 'person'} size={20} className="text-brand" /> {text}</div>
              ))}
              <MockButton id="send" label={t('step.7.send')} frame={f} tone="success" />
            </>
          )}
        </div>

        <div className="flex gap-2">
          {done
            ? <Btn variant="success" className="flex-1" icon="check" onClick={close} data-testid="tour-go">{t('tour.go')}</Btn>
            : <Btn variant="ghost" className="flex-1" onClick={close} data-testid="tour-skip">{t('tour.skip')}</Btn>}
          {done && <Btn variant="secondary" icon="refresh" onClick={() => setRun((r) => r + 1)} aria-label={t('tour.again')} data-testid="tour-again" />}
        </div>
      </div>
    </div>
  )
}
