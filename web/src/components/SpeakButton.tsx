// The speaker button: plays the recorded prompt, else a browser voice, else shows the words big.
import { useEffect, useRef, useState } from 'react'
import { playPrompt, stopAudio, type PlayMode } from '../audio/playPrompt'
import { useLang } from '../i18n'
import { Icon } from './Icon'

interface Props {
  promptKey: string
  /** the words (for the voice fallback and for the big-text fallback) */
  text: string
  autoPlay?: boolean
  label?: string
  className?: string
  /** a full-width "listen" bar (claim steps and results); default is a small pill */
  bar?: boolean
}

export function SpeakButton({ promptKey, text, autoPlay, label, className = '', bar }: Props) {
  const { lang, t } = useLang()
  const [mode, setMode] = useState<PlayMode | null>(null)
  const [busy, setBusy] = useState(false)
  const played = useRef<string>('')

  const play = async (shown: boolean) => {
    setBusy(true)
    const r = await playPrompt(promptKey, lang, text)
    setBusy(false)
    if (shown) setMode(r.mode)
  }

  // Try once when the step opens. If the browser blocks it, nothing bad happens.
  useEffect(() => {
    if (!autoPlay) return
    const id = promptKey + lang
    if (played.current === id) return
    played.current = id
    void play(false)
    // Reset the guard on cleanup: React dev mode mounts twice, and without this the second mount skipped playing
    // after the first mount's cleanup had already cut the audio off (the reader missed the start of the line).
    return () => { played.current = ''; stopAudio() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptKey, lang, autoPlay])

  return (
    <div className={className}>
      {bar ? (
        <button type="button" onClick={() => void play(true)} aria-label={label ?? t('common.hear')}
          className="flex w-full items-center gap-4 rounded-[18px] border border-line bg-white p-3 pe-5 text-start shadow-card transition hover:border-brand/40 active:scale-[.99]">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-white shadow-lift"><Icon name="speaker" size={24} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-bold leading-tight text-ink">{label ?? t('common.hear')}</span>
            <span className="mt-1 block text-sm leading-snug text-muted">{t('common.hear_sub')}</span>
          </span>
          <span className="flex h-7 items-center gap-[3px]" aria-hidden="true">
            {[0.45, 0.8, 0.55, 1, 0.6, 0.85, 0.4].map((h, i) => (
              <span key={i} className={`w-[3px] rounded-full bg-brand ${busy ? 'wave-bar' : ''}`} style={{ height: `${h * 100}%`, animationDelay: `${i * 90}ms` }} />
            ))}
          </span>
        </button>
      ) : (
        <button
          type="button" onClick={() => void play(true)} aria-label={label ?? t('common.hear')}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-white text-ink px-4 min-h-[48px] font-semibold shadow-sm hover:border-brand/40 transition-colors"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-soft text-brand-dark"><Icon name="speaker" size={18} className={busy ? 'animate-pulse' : ''} /></span>
          <span>{label ?? t('common.hear')}</span>
        </button>
      )}
      {mode === 'text' && (
        <p role="status" className="mt-3 rounded-xl bg-white border-2 border-brand/30 p-4 text-xl font-semibold leading-relaxed" data-testid="audio-text-fallback">
          {text}
        </p>
      )}
    </div>
  )
}
