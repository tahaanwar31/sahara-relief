// Login state (token + user) and the helper's active family. Both survive a reload, but belong to ONE browser tab:
// two tabs can hold two different logins (for example a citizen in one and an admin in the other).
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, setToken, setUnauthenticatedHandler, type User } from '../api'
import { clearLocalDrafts } from '../offline/runtime'

const KEY = 'sahara.auth'
const FAM = 'sahara.family'

interface Stored { token: string; user: User; exp: number }
function read(): Stored | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Stored | null
    if (s && s.exp > Date.now()) return s
  } catch { /* ignore */ }
  return null
}

export interface ActiveFamily { person_id: string; name_roman: string; name_ur?: string }

interface AuthCtx {
  user: User | null
  family: ActiveFamily | null
  login: (email: string, secret: string) => Promise<User>
  logout: () => Promise<void>
  startFamily: (f: ActiveFamily) => Promise<void>
  endFamily: () => Promise<void>
  expired: boolean
}
const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = read()
  if (initial) setToken(initial.token)
  const [user, setUser] = useState<User | null>(initial?.user ?? null)
  const [expired, setExpired] = useState(false)
  const [family, setFamily] = useState<ActiveFamily | null>(() => {
    try { return JSON.parse(sessionStorage.getItem(FAM) ?? 'null') } catch { return null }
  })

  const clear = useCallback(() => {
    setToken(null); setUser(null); setFamily(null)
    try { sessionStorage.removeItem(KEY); sessionStorage.removeItem(FAM) } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    setUnauthenticatedHandler(() => { clear(); setExpired(true) })
    return () => setUnauthenticatedHandler(null)
  }, [clear])

  const login = useCallback(async (email: string, secret: string) => {
    const r = await api.login(email.trim(), secret)
    setToken(r.access_token)
    setUser(r.user)
    setExpired(false)
    try { sessionStorage.setItem(KEY, JSON.stringify({ token: r.access_token, user: r.user, exp: Date.now() + (r.expires_in || 3600) * 1000 } satisfies Stored)) } catch { /* ignore */ }
    return r.user
  }, [])

  const endFamily = useCallback(async () => {
    setFamily(null)
    try { sessionStorage.removeItem(FAM) } catch { /* ignore */ }
    await clearLocalDrafts() // the screen must not keep the family's details
    try { await api.helperSession(null) } catch { /* offline: the service closes idle sessions itself */ }
  }, [])

  const startFamily = useCallback(async (f: ActiveFamily) => {
    await api.helperSession(f.person_id)
    setFamily(f)
    try { sessionStorage.setItem(FAM, JSON.stringify(f)) } catch { /* ignore */ }
  }, [])

  const logout = useCallback(async () => {
    if (family) await endFamily()
    clear()
  }, [family, endFamily, clear])

  const value = useMemo(() => ({ user, family, login, logout, startFamily, endFamily, expired }), [user, family, login, logout, startFamily, endFamily, expired])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
