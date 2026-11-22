import { describe, it, expect, beforeEach } from 'vitest'
import { request, setTransport, setToken, ApiError, NetworkError, toApiError } from '../src/api/client'

describe('api client', () => {
  beforeEach(() => { setToken(null); setTransport(null) })

  it('maps the contract error format', async () => {
    setTransport(async () => ({ status: 403, json: { error: { code: 'CONSENT_REQUIRED', message: 'No consent', message_ur: 'اجازت نہیں', request_id: 'r1' } } }))
    const e = (await request('GET', '/x').catch((x) => x)) as ApiError
    expect(e).toBeInstanceOf(ApiError)
    expect(e.code).toBe('CONSENT_REQUIRED')
    expect(e.messageUr).toBe('اجازت نہیں')
    expect(e.requestId).toBe('r1')
  })
  it('maps plain status codes and FastAPI detail', () => {
    expect(toApiError(404, { detail: 'nope' }).code).toBe('NOT_FOUND')
    expect(toApiError(422, null).code).toBe('VALIDATION')
    expect(toApiError(500, {}).code).toBe('INTERNAL')
  })
  it('adds token and an Idempotency-Key on writes only; reuses a given key', async () => {
    const seen: Record<string, string>[] = []
    setTransport(async (req, tok) => { seen.push({ ...(req.headers ?? {}), tok: tok ?? '' }); return { status: 200, json: {} } })
    setToken('abc')
    await request('GET', '/me')
    await request('PUT', '/cases/1/draft', { body: {} })
    await request('PUT', '/cases/1/draft', { body: {}, idempotencyKey: 'fixed' })
    expect(seen[0]['Idempotency-Key']).toBeUndefined()
    expect(seen[0].tok).toBe('abc')
    expect(seen[1]['Idempotency-Key']).toBeTruthy()
    expect(seen[2]['Idempotency-Key']).toBe('fixed')
  })
  it('turns a transport failure into NetworkError', async () => {
    setTransport(async () => { throw new NetworkError('down') })
    await expect(request('GET', '/x')).rejects.toBeInstanceOf(NetworkError)
  })
})
