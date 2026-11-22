// One small HTTP client. Everything the web app sends goes through request().
// - follows the contract error format  { error: { code, message, message_ur, details, request_id } }
// - adds Authorization and an Idempotency-Key on every write
// - in mock mode the "network" is an in-browser stub (see mock.ts); a mock call still fails when the phone is offline
import { reportNetwork } from '../offline/net'

export type ApiMode = 'mock' | 'live'
const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env
export const API_BASE: string = (env.VITE_API_BASE ?? 'http://localhost:8000').replace(/\/$/, '')
export const API_MODE: ApiMode = env.VITE_API_MODE === 'live' || (!env.VITE_API_MODE && env.VITE_API_BASE) ? 'live' : 'mock'
export const IS_DEV_UI = API_MODE === 'mock' || !!env.DEV

export type ErrorCode =
  | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION' | 'CONFLICT'
  | 'RATE_LIMITED' | 'CONSENT_REQUIRED' | 'INTERNAL' | 'NETWORK' | 'UNKNOWN'

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  401: 'UNAUTHENTICATED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 422: 'VALIDATION', 429: 'RATE_LIMITED', 500: 'INTERNAL',
}

/** The service answered with an error. */
export class ApiError extends Error {
  code: ErrorCode
  status: number
  messageUr?: string
  details?: unknown
  requestId?: string
  constructor(status: number, code: ErrorCode, message: string, extra: { messageUr?: string; details?: unknown; requestId?: string } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.messageUr = extra.messageUr
    this.details = extra.details
    this.requestId = extra.requestId
  }
}
/** No answer at all: offline, timeout, service down. These are the errors the outbox retries. */
export class NetworkError extends Error {
  constructor(message = 'No connection') { super(message); this.name = 'NetworkError' }
}

export interface Req {
  method: string
  path: string
  query?: Record<string, string | number | boolean | null | undefined>
  body?: unknown
  form?: FormData
  headers?: Record<string, string>
}
export interface Res { status: number; json: unknown }
export type Transport = (req: Req, token: string | null) => Promise<Res>

let token: string | null = null
let onUnauthenticated: (() => void) | null = null
let customTransport: Transport | null = null

export function setToken(t: string | null) { token = t }
export function getToken() { return token }
export function setUnauthenticatedHandler(fn: (() => void) | null) { onUnauthenticated = fn }
/** Tests (and the mock mode) replace the transport. */
export function setTransport(t: Transport | null) { customTransport = t }

export function newKey(): string {
  const c = globalThis.crypto as Crypto | undefined
  if (c?.randomUUID) return c.randomUUID()
  return 'k-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

function buildUrl(path: string, query?: Req['query']) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  const qs = q.toString()
  return API_BASE + path + (qs ? '?' + qs : '')
}

const liveTransport: Transport = async (req, tok) => {
  const headers: Record<string, string> = { Accept: 'application/json', ...(req.headers ?? {}) }
  if (tok) headers.Authorization = 'Bearer ' + tok
  let body: BodyInit | undefined
  if (req.form) body = req.form
  else if (req.body !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(req.body) }
  const ctl = new AbortController()
  // 75 s: a free host can need about a minute to wake up, and a slow answer is not the same as "no signal"
  const timer = setTimeout(() => ctl.abort(), 75000)
  try {
    const r = await fetch(buildUrl(req.path, req.query), { method: req.method, headers, body, signal: ctl.signal })
    let json: unknown = null
    const text = await r.text()
    if (text) { try { json = JSON.parse(text) } catch { json = { raw: text } } }
    return { status: r.status, json }
  } catch (e) {
    throw new NetworkError(e instanceof Error ? e.message : 'No connection')
  } finally {
    clearTimeout(timer)
  }
}

let mockTransportPromise: Promise<Transport> | null = null
async function getTransport(): Promise<Transport> {
  if (customTransport) return customTransport
  if (API_MODE === 'mock') {
    // The stubs are loaded on demand so live builds never download them.
    mockTransportPromise ??= import('./mock').then((m) => m.mockTransport)
    return mockTransportPromise
  }
  return liveTransport
}

/** Turn any error reply into an ApiError, following the contract (and tolerating other shapes). */
export function toApiError(status: number, json: unknown): ApiError {
  const j = json as Record<string, unknown> | null
  const e = (j && typeof j === 'object' ? (j as { error?: unknown }).error : null) as ApiErrorLike | null
  if (e && typeof e === 'object' && typeof e.code === 'string') {
    return new ApiError(status, e.code as ErrorCode, e.message ?? 'Something went wrong.', {
      messageUr: e.message_ur, details: e.details, requestId: e.request_id,
    })
  }
  // FastAPI default {detail: ...}
  const code: ErrorCode = STATUS_TO_CODE[status] ?? (status >= 500 ? 'INTERNAL' : 'UNKNOWN')
  const detail = j && typeof j === 'object' ? (j as { detail?: unknown }).detail : undefined
  return new ApiError(status, code, typeof detail === 'string' ? detail : 'Something went wrong.', { details: detail })
}
interface ApiErrorLike { code?: string; message?: string; message_ur?: string; details?: unknown; request_id?: string }

export interface RequestOptions {
  query?: Req['query']
  body?: unknown
  form?: FormData
  /** Writes always carry one. Pass your own to make a retry safe (the outbox does). */
  idempotencyKey?: string
  headers?: Record<string, string>
}

export async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) }
  if (method !== 'GET' && method !== 'HEAD') headers['Idempotency-Key'] = opts.idempotencyKey ?? newKey()
  const transport = await getTransport()
  let res: Res
  try {
    res = await transport({ method, path, query: opts.query, body: opts.body, form: opts.form, headers }, token)
  } catch (e) {
    if (e instanceof NetworkError) reportNetwork(false)
    throw e instanceof NetworkError || e instanceof ApiError ? e : new NetworkError(e instanceof Error ? e.message : undefined)
  }
  reportNetwork(true)
  if (res.status >= 200 && res.status < 300) return res.json as T
  const err = toApiError(res.status, res.json)
  if (err.code === 'UNAUTHENTICATED' && token) onUnauthenticated?.()
  throw err
}

export const get = <T>(path: string, query?: Req['query']) => request<T>('GET', path, { query })
export const post = <T>(path: string, body?: unknown, opts: RequestOptions = {}) => request<T>('POST', path, { ...opts, body })
export const put = <T>(path: string, body?: unknown, opts: RequestOptions = {}) => request<T>('PUT', path, { ...opts, body })
export const del = <T>(path: string, opts: RequestOptions = {}) => request<T>('DELETE', path, opts)

/** Plain words for an error, in the chosen language. */
export function errorText(e: unknown, lang: 'ur' | 'en'): string {
  if (e instanceof NetworkError) return lang === 'ur' ? 'سگنل نہیں ہے۔ آپ کا کام فون میں محفوظ ہے۔' : 'No signal. Your work is kept on your phone.'
  if (e instanceof ApiError) {
    if (lang === 'ur' && e.messageUr) return e.messageUr
    return e.message
  }
  return lang === 'ur' ? 'کچھ غلط ہو گیا۔ دوبارہ کوشش کریں۔' : 'Something went wrong. Please try again.'
}
