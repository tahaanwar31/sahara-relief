// The frame of one claim step: progress dots, resume code, a title with a speaker, the content, big buttons.
import { useState, type ReactNode } from 'react'
import { Btn } from '../../../components/ui'
import { Icon } from '../../../components/Icon'
import { SpeakButton } from '../../../components/SpeakButton'
import { Tutorial, tourPending } from '../../../components/Tutorial'
import { useLang } from '../../../i18n'
import { useAuth } from '../../../auth/AuthContext'

export const TOTAL_STEPS = 8

export function ProgressDots({ step }: { step: number }) {
  const { t } = useLang()
  return (
    <div role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL_STEPS} aria-valuenow={step} aria-label={t('step.progress', { n: step, total: TOTAL_STEPS })} className="space-y-2" data-testid="progress">
      <div className="flex items-center justify-between text-sm font-semibold text-muted">
        <span>{t('step.progress', { n: step, total: TOTAL_STEPS })}</span>
        <span className="ltr text-brand">{Math.round((step / TOTAL_STEPS) * 100)}%</span>
      </div>
      <div className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <span key={i} className={`h-2 flex-1 rounded-full transition-colors duration-300 ${i < step ? 'bg-brand' : 'bg-line'}`} />
        ))}
      </div>
      <span className="hidden" data-state="now" />
    </div>
  )
}

export type SaveState = 'idle' | 'server' | 'phone'

export function ResumeChip({ code, save }: { code?: string; save: SaveState }) {
  const { t } = useLang()
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted" data-testid="save-line">
      {save === 'phone' && <span className="inline-flex items-center gap-1.5 text-human font-semibold"><Icon name="phone" size={16} /> {t('save.phone')}</span>}
      {save === 'server' && <span className="inline-flex items-center gap-1.5 text-auto font-semibold"><Icon name="check" size={16} /> {t('save.saved')}</span>}
      {code && <span>{t('resume.code')}: <b className="ltr text-ink text-base tracking-widest" data-testid="resume-code">{code}</b></span>}
    </div>
  )
}

export function Hero() {
  const { t } = useLang()
  const { user } = useAuth()
  if (!user) return null
  return (
    <div className="relative overflow-hidden rounded-[26px] p-6 text-white" style={{ background: '#2B2420' }}>
      <div className="absolute -top-10 -end-10 h-40 w-40 rounded-full bg-white/[.06]" aria-hidden />
      <div className="absolute -bottom-12 start-6 h-32 w-32 rounded-full bg-[#E2693B]/35" aria-hidden />
      <p className="relative text-white/70 font-semibold">{t('home.hello')}</p>
      <p className="relative mt-1 text-3xl font-bold tracking-tight">{user.name}</p>
      <p className="relative mt-2 text-white/80">{t('home.sub')}</p>
    </div>
  )
}

interface FrameProps {
  step: number
  title: string
  /** the spoken text: audio key is step_<n> unless promptKey is given */
  prompt: string
  promptKey?: string
  resume?: string
  save: SaveState
  children: ReactNode
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  nextVariant?: 'primary' | 'success'
  onBack?: () => void
  busy?: boolean
}

export function StepFrame({ step, title, prompt, promptKey, resume, save, children, onNext, nextLabel, nextDisabled, nextVariant = 'primary', onBack, busy }: FrameProps) {
  const { t, dir } = useLang()
  const fwd = dir === 'rtl' ? 'back' : 'fwd'
  const { user, family } = useAuth()
  // while the practice demo is on, the page's own voice waits (two voices at once would be confusing)
  const [tourOpen, setTourOpen] = useState(() => tourPending(user, family, step))
  return (
    <div className="space-y-5" data-testid={`step-${step}`}>
      <Tutorial step={step} onOpenChange={setTourOpen} />
      {step === 1 && !family && user && <Hero />}
      <div className="space-y-2">
        <ProgressDots step={step} />
        <ResumeChip code={resume} save={save} />
      </div>
      <div className="card space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="flex-1" data-testid="step-title">{title}</h1>
        </div>
        <SpeakButton bar key={tourOpen ? 'tour' : 'page'} promptKey={promptKey ?? `step_${step}`} text={prompt} autoPlay={!tourOpen} />
        <div className="pt-1">{children}</div>
      </div>
      {(onNext || onBack) && (
        <div className="flex gap-3">
          {onBack && <Btn variant="secondary" onClick={onBack} aria-label={t('common.back')} icon={dir === 'rtl' ? 'fwd' : 'back'}><span className="sr-only sm:not-sr-only">{t('common.back')}</span></Btn>}
          {onNext && (
            <Btn variant={nextVariant} className="flex-1" onClick={onNext} disabled={nextDisabled || busy}>
              {busy ? t('common.wait') : (nextLabel ?? t('common.next'))}
              {!busy && <Icon name={fwd} size={26} />}
            </Btn>
          )}
        </div>
      )}
    </div>
  )
}
