// Tiny i18n: two JSON dictionaries, a t() function, and the page direction (Urdu is right-to-left).
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import en from './en.json'
import ur from './ur.json'
import type { Lang } from '../api/types'

type Dict = Record<string, string>
const dicts: Record<Lang, Dict> = { en: en as Dict, ur: ur as Dict }

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  let s = dicts[lang][key] ?? dicts.en[key] ?? key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
  return s
}
export const dictionaries = dicts

interface Ctx { lang: Lang; setLang: (l: Lang) => void; t: (key: string, vars?: Record<string, string | number>) => string; dir: 'rtl' | 'ltr' }
const LangCtx = createContext<Ctx>({ lang: 'en', setLang: () => {}, t: (k) => k, dir: 'ltr' })

const KEY = 'sahara.lang'
function initial(): Lang {
  try { const v = localStorage.getItem(KEY); if (v === 'ur' || v === 'en') return v } catch { /* ignore */ }
  return 'ur'
}

export function LangProvider({ children, initialLang }: { children: ReactNode; initialLang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(initialLang ?? initial())
  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try { localStorage.setItem(KEY, l) } catch { /* ignore */ }
  }, [])
  const dir = lang === 'ur' ? 'rtl' : 'ltr'
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
  }, [lang, dir])
  const t = useCallback((key: string, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang])
  const value = useMemo(() => ({ lang, setLang, t, dir } as Ctx), [lang, setLang, t, dir])
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>
}

export const useLang = () => useContext(LangCtx)
export const useT = () => useContext(LangCtx).t

/** Pick the text for the current language out of { en, ur }. */
export function pick(lang: Lang, b?: { en?: string; ur?: string } | null): string {
  if (!b) return ''
  return (lang === 'ur' ? b.ur || b.en : b.en || b.ur) ?? ''
}
