import { describe, it, expect } from 'vitest'
import { createOutbox, type OutboxOp } from '../src/offline/outbox'
import { NetworkError, ApiError } from '../src/api/client'

let n = 0
const mk = (send: (op: OutboxOp) => Promise<unknown>) => createOutbox(send, 'test-outbox-' + n++)

describe('outbox', () => {
  it('queues while offline, replays in order when online, and never duplicates', async () => {
    let online = false
    const server = new Map<string, string>()
    const order: string[] = []
    const ob = mk(async (op) => {
      if (!online) throw new NetworkError()
      if (!server.has(op.id)) { server.set(op.id, op.path); order.push(op.path) }
      return {}
    })
    await ob.enqueue({ kind: 'json', method: 'POST', path: '/a', label: 'a' })
    await ob.enqueue({ kind: 'json', method: 'POST', path: '/b', label: 'b' })
    let r = await ob.flush()
    expect(r.stoppedByNetwork).toBe(true)
    expect((await ob.list()).length).toBe(2)
    online = true
    r = await ob.flush()
    expect(r.sent).toBe(2)
    await ob.flush()
    expect(order).toEqual(['/a', '/b'])
    expect((await ob.list()).length).toBe(0)
  })
  it('a lost reply is retried with the same key (the server sees one)', async () => {
    const seen = new Set<string>()
    let first = true
    const ob = mk(async (op) => {
      seen.add(op.id)
      if (first) { first = false; throw new NetworkError() }
      return {}
    })
    await ob.enqueue({ kind: 'json', method: 'POST', path: '/submit', label: 'submit' })
    await ob.flush(); await ob.flush()
    expect(seen.size).toBe(1)
  })
  it('drops an op after a final 422 and keeps going', async () => {
    const sent: string[] = []
    const ob = mk(async (op) => { if (op.path === '/bad') throw new ApiError(422, 'VALIDATION', 'bad'); sent.push(op.path) })
    await ob.enqueue({ kind: 'json', method: 'POST', path: '/bad', label: 'x' })
    await ob.enqueue({ kind: 'json', method: 'POST', path: '/ok', label: 'y' })
    const r = await ob.flush()
    expect(r.failed).toBe(1)
    expect(sent).toEqual(['/ok'])
    expect(ob.failed().length).toBe(1)
  })
  it('replaces an older waiting draft save for the same case', async () => {
    const ob = mk(async () => ({}))
    await ob.enqueue({ kind: 'json', method: 'PUT', path: '/cases/1/draft', body: { step: 2 }, label: 'draft', coalesceKey: 'draft:1', caseId: '1' })
    await ob.enqueue({ kind: 'json', method: 'PUT', path: '/cases/1/draft', body: { step: 3 }, label: 'draft', coalesceKey: 'draft:1', caseId: '1' })
    const l = await ob.list()
    expect(l.length).toBe(1)
    expect((l[0].body as { step: number }).step).toBe(3)
  })
})
