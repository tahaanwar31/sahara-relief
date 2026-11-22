// A very small hash router (about 40 lines instead of a 25 KB library). URLs look like  #/claim/abc/3
import { useSyncExternalStore } from 'react'

export function currentPath(): string {
  const h = window.location.hash.replace(/^#/, '')
  return (h.split('?')[0] || '/') as string
}
export function currentQuery(): URLSearchParams {
  const h = window.location.hash.replace(/^#/, '')
  return new URLSearchParams(h.includes('?') ? h.split('?')[1] : '')
}
export function navigate(to: string, replace = false) {
  const url = '#' + to
  if (replace) window.location.replace(url)
  else window.location.hash = to
}

const subscribe = (cb: () => void) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb) }
/** Re-renders when the address changes. Returns the full "path?query" so query changes count too. */
export function useHash(): string {
  return useSyncExternalStore(subscribe, () => window.location.hash, () => '')
}
export function usePath(): string {
  useHash()
  return currentPath()
}

/** "/claim/:id/:step" against "/claim/abc/3"  ->  { id: 'abc', step: '3' }  (or null) */
export function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split('/').filter(Boolean)
  const b = path.split('/').filter(Boolean)
  if (a.length !== b.length) return null
  const out: Record<string, string> = {}
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) out[a[i].slice(1)] = decodeURIComponent(b[i])
    else if (a[i] !== b[i]) return null
  }
  return out
}
