// Shared building blocks: banner, buttons, chips, notices, loading and error boxes, the zone mark.
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import { useLang } from '../i18n'
import { ApiError, NetworkError, errorText } from '../api'
import type { Zone, CheckVerdict, ConsentStatus } from '../api/types'

/** On every screen. */
// Removed from the screens on purpose (the product owner wants a clean look). The prototype / made-up data label lives in the README, the demo script and the slides.
export function SyntheticBanner() {
  return null
}

type Variant = 'primary' | 'secondary' | 'danger' | 'danger-outline' | 'ghost' | 'success'
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; icon?: IconName; small?: boolean; block?: boolean }
export function Btn({ variant = 'primary', icon, small, block, className = '', children, ...rest }: BtnProps) {
  return (
    <button type="button" {...rest} className={`btn btn-${variant} ${small ? 'btn-sm' : ''} ${block ? 'w-full' : ''} ${className}`}>
      {icon && <Icon name={icon} size={small ? 20 : 26} />}
      {children}
    </button>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>
}

type Tone = 'neutral' | 'auto' | 'ask' | 'human' | 'danger' | 'brand'
const toneCls: Record<Tone, string> = {
  neutral: 'bg-white text-muted border-line',
  auto: 'bg-auto-soft text-auto border-auto/25',
  ask: 'bg-ask-soft text-ask border-ask/25',
  human: 'bg-human-soft text-human border-human/25',
  danger: 'bg-danger-soft text-danger border-danger/25',
  brand: 'bg-brand-soft text-brand border-brand/25',
}
export function Chip({ tone = 'neutral', icon, children }: { tone?: Tone; icon?: IconName; children: ReactNode }) {
  return <span className={`chip ${toneCls[tone]}`}>{icon && <Icon name={icon} size={16} />}{children}</span>
}

/** Zone look: colour + icon + word (never colour alone). */
export const ZONE_LOOK: Record<Zone, { tone: Tone; icon: IconName; key: string; bg: string; fg: string }> = {
  AUTO: { tone: 'auto', icon: 'check', key: 'zone.AUTO', bg: 'bg-auto-soft', fg: 'text-auto' },
  ASK_MORE: { tone: 'ask', icon: 'camera', key: 'zone.ASK_MORE', bg: 'bg-ask-soft', fg: 'text-ask' },
  HUMAN: { tone: 'human', icon: 'person', key: 'zone.HUMAN', bg: 'bg-human-soft', fg: 'text-human' },
}
export function ZoneChip({ zone }: { zone: Zone }) {
  const { t } = useLang()
  const z = ZONE_LOOK[zone]
  return <span className="inline-flex whitespace-nowrap"><Chip tone={z.tone} icon={z.icon}>{t(z.key)}</Chip></span>
}

export const VERDICT_LOOK: Record<CheckVerdict, { tone: Tone; icon: IconName; word: string }> = {
  pass: { tone: 'auto', icon: 'check', word: 'Pass' },
  unsure: { tone: 'ask', icon: 'help', word: 'Not sure' },
  fail: { tone: 'danger', icon: 'x', word: 'Fail' },
  skip: { tone: 'neutral', icon: 'pause', word: 'Skipped' },
}
export function VerdictChip({ verdict }: { verdict: CheckVerdict }) {
  const v = VERDICT_LOOK[verdict] ?? VERDICT_LOOK.skip
  return <Chip tone={v.tone} icon={v.icon}>{v.word}</Chip>
}
export function ConsentChip({ status }: { status?: ConsentStatus | 'none' }) {
  const { t } = useLang()
  if (status === 'granted') return <Chip tone="auto" icon="check">{t('consent.granted')}</Chip>
  if (status === 'withdrawn') return <Chip tone="danger" icon="x">{t('consent.withdrawn')}</Chip>
  if (status === 'expired') return <Chip tone="ask" icon="clock">{t('consent.expired')}</Chip>
  return <Chip tone="neutral" icon="help">{t('consent.none')}</Chip>
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-10 text-muted">
      <span className="h-6 w-6 rounded-full border-[3px] border-line border-t-brand animate-spin" />
      {label && <span>{label}</span>}
    </div>
  )
}

export function Notice({ tone = 'brand', icon = 'info', children, className = '' }: { tone?: Tone; icon?: IconName; children: ReactNode; className?: string }) {
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`flex gap-3 rounded-xl border p-4 ${toneCls[tone]} ${className}`}>
      <Icon name={icon} className="mt-0.5" />
      <div className="min-w-0 text-ink">{children}</div>
    </div>
  )
}

/** A load failed: plain words, and a retry button. */
export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { lang, t } = useLang()
  const offline = error instanceof NetworkError
  const forbidden = error instanceof ApiError && (error.code === 'FORBIDDEN' || error.code === 'CONSENT_REQUIRED')
  return (
    <div className="card text-center py-10" role="alert">
      <Icon name={offline ? 'wifioff' : forbidden ? 'lock' : 'warning'} size={44} className="mx-auto text-muted" />
      <p className="mt-3 text-lg font-semibold">{offline ? t('err.offline.title') : forbidden ? t('err.forbidden.title') : t('err.generic.title')}</p>
      <p className="mt-1 text-muted">{errorText(error, lang)}</p>
      {onRetry && <Btn className="mt-5" variant="secondary" icon="refresh" onClick={onRetry}>{t('common.retry')}</Btn>}
    </div>
  )
}

export function PageHead({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1>{title}</h1>
        {sub && <p className="text-muted mt-1">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

export const money = (n: number | undefined | null) => (n == null ? '-' : 'Rs ' + Math.round(n).toLocaleString('en-US'))
export function fmtDate(iso?: string | null, lang: 'ur' | 'en' = 'en') {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
export function fmtDateTime(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
