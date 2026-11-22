// Big number buttons for PINs, ID numbers and resume codes. Works with touch, mouse and a real keyboard.
import { useEffect } from 'react'
import { Icon } from './Icon'
import { useT } from '../i18n'

interface Props {
  value: string
  onChange: (v: string) => void
  maxLength: number
  mask?: boolean
  format?: (v: string) => string
  onEnter?: () => void
  label?: string
  autoFocusKeys?: boolean
}

const URDU: Record<string, string> = { '0': 'صفر', '1': 'ایک', '2': 'دو', '3': 'تین', '4': 'چار', '5': 'پانچ', '6': 'چھ', '7': 'سات', '8': 'آٹھ', '9': 'نو' }
const KEY = 'mx-auto flex h-[clamp(42px,6.2vh,66px)] w-[clamp(42px,6.2vh,66px)] flex-col items-center justify-center gap-0 rounded-full bg-white shadow-card ring-1 ring-black/5 transition active:scale-90 active:bg-brand-soft'

export function NumberPad({ value, onChange, maxLength, mask, format, onEnter, label, autoFocusKeys = true }: Props) {
  const t = useT()
  useEffect(() => {
    if (!autoFocusKeys) return
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return
      if (/^\d$/.test(e.key) && value.length < maxLength) onChange(value + e.key)
      else if (e.key === 'Backspace') onChange(value.slice(0, -1))
      else if (e.key === 'Enter' && onEnter) onEnter()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [value, maxLength, onChange, onEnter, autoFocusKeys])

  const shown = mask ? null : format ? format(value) : value
  const press = (d: string) => value.length < maxLength && onChange(value + d)

  return (
    <div className="mx-auto w-full max-w-[280px]" aria-label={label}>
      <div className="ltr mb-[clamp(6px,1.4vh,18px)] flex min-h-[clamp(24px,4vh,40px)] items-center justify-center gap-3" aria-live="polite" data-testid="pad-display">
        {mask
          ? Array.from({ length: maxLength }, (_, i) => (
              <span key={i} className={`h-3.5 w-3.5 rounded-full transition-all ${i < value.length ? 'scale-110 bg-brand' : 'bg-ink/15'}`} />
            ))
          : <span className="rounded-2xl bg-white px-5 py-2 text-2xl font-semibold tracking-widest shadow-card">{shown || <span className="text-muted/50">{'_'.repeat(Math.min(maxLength, 6))}</span>}</span>}
      </div>
      <div className="ltr grid grid-cols-3 gap-y-[clamp(5px,1.1vh,14px)]">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" onClick={() => press(d)} className={KEY}>
            <span className="text-[clamp(20px,3.4vh,28px)] font-semibold leading-none">{d}</span>
            <span className="font-urdu text-[12px] leading-[1.2] text-muted">{URDU[d]}</span>
          </button>
        ))}
        <button type="button" aria-label={t('pad.delete')} onClick={() => onChange(value.slice(0, -1))} className={KEY + ' text-muted'}><Icon name="back" size={26} /></button>
        <button type="button" onClick={() => press('0')} className={KEY}>
          <span className="text-[clamp(20px,3.4vh,28px)] font-semibold leading-none">0</span>
          <span className="font-urdu text-[12px] leading-[1.2] text-muted">{URDU['0']}</span>
        </button>
        <button type="button" aria-label={t('pad.clear')} onClick={() => onChange('')} className={KEY + ' text-muted'}><Icon name="x" size={24} /></button>
      </div>
    </div>
  )
}

export const formatCnic = (v: string) => [v.slice(0, 5), v.slice(5, 12), v.slice(12, 13)].filter(Boolean).join('-')
