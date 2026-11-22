// playPrompt(key, lang): play the recorded file if there is one, else speak it with the browser voice,
// else tell the caller to show the text big. It never throws.
//   files:  /audio/<lang>/<key>.mp3   (made later by the deploy owner; the service worker caches them)
import type { Lang } from '../api/types'

export type PlayMode = 'file' | 'speech' | 'text'
export interface PlayResult { mode: PlayMode }

const fileExists = new Map<string, boolean>()
let current: HTMLAudioElement | null = null
let ticket = 0 // each playPrompt call takes a number; a call that is no longer the newest must not start sound

export function audioUrl(key: string, lang: Lang) { return `/audio/${lang}/${key}.mp3` }

async function hasFile(url: string): Promise<boolean> {
  const known = fileExists.get(url)
  if (known !== undefined) return known
  try {
    const r = await fetch(url, { method: 'HEAD' })
    const type = r.headers.get('content-type') ?? ''
    const ok = r.ok && /audio|mpeg|octet-stream/i.test(type)
    fileExists.set(url, ok)
    return ok
  } catch {
    // Offline: the cache may still answer a real GET later. Try playing instead of caching "no".
    return true
  }
}

function pickVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  if (typeof speechSynthesis === 'undefined') return undefined
  const voices = speechSynthesis.getVoices()
  return voices.find((v) => v.lang.toLowerCase().startsWith(lang))
}

export function stopAudio() {
  try { current?.pause() } catch { /* ignore */ }
  current = null
  try { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel() } catch { /* ignore */ }
}

function playFile(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      try { current?.pause() } catch { /* ignore */ }
      const a = new Audio(url)
      current = a
      a.onerror = () => resolve(false)
      a.onended = () => resolve(true)
      a.play().then(() => resolve(true), () => resolve(false))
    } catch { resolve(false) }
  })
}

/**
 * @param text the words of the prompt (used for the speech fallback)
 */
export async function playPrompt(key: string, lang: Lang, text?: string): Promise<PlayResult> {
  stopAudio()
  const mine = ++ticket
  try {
    const url = audioUrl(key, lang)
    if (typeof Audio !== 'undefined' && (await hasFile(url))) {
      if (mine !== ticket) return { mode: 'file' } // a newer request took over while we were checking
      if (await playFile(url)) return { mode: 'file' }
    }
  } catch { /* fall through */ }
  try {
    if (mine !== ticket) return { mode: 'text' }
    const voice = pickVoice(lang)
    if (voice && text && typeof SpeechSynthesisUtterance !== 'undefined') {
      const u = new SpeechSynthesisUtterance(text)
      u.voice = voice
      u.lang = voice.lang
      speechSynthesis.speak(u)
      return { mode: 'speech' }
    }
  } catch { /* fall through */ }
  return { mode: 'text' }
}

export function resetAudioCache() { fileExists.clear() }
