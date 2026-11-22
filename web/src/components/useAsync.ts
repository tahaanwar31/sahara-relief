// Load data, show loading / error states, and (optionally) poll every few seconds. No websockets.
import { useCallback, useEffect, useRef, useState } from 'react'
import { isOnline } from '../offline/net'

export interface AsyncState<T> { data: T | undefined; error: unknown; loading: boolean; reload: () => void }

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], pollMs = 0): AsyncState<T> {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const fnRef = useRef(fn)
  fnRef.current = fn
  const alive = useRef(true)

  const run = useCallback((quiet: boolean) => {
    if (!quiet) setLoading(true)
    fnRef.current().then(
      (d) => { if (alive.current) { setData(d); setError(null); setLoading(false) } },
      (e) => { if (alive.current) { setError(e); setLoading(false) } },
    )
  }, [])

  useEffect(() => {
    alive.current = true
    run(false)
    let timer: ReturnType<typeof setInterval> | undefined
    if (pollMs > 0) timer = setInterval(() => { if (!document.hidden && isOnline()) run(true) }, pollMs)
    return () => { alive.current = false; if (timer) clearInterval(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, error, loading, reload: () => run(false) }
}
