// The outbox: writes made without signal wait here (IndexedDB) and are sent in order when signal returns.
// - every op carries its own idempotency key, so a retry after a lost reply never creates a duplicate
// - ops are only removed after the service said yes (or said a final "no" such as 422)
// - a draft save for the same case replaces an older waiting one (keeps the queue short)
import { openDB, type IDBPDatabase } from 'idb'
import { ApiError, NetworkError, newKey } from '../api/client'

export interface OutboxOp {
  id: string // also the Idempotency-Key
  seq: number
  kind: 'json' | 'upload'
  method: string
  path: string
  body?: unknown
  file?: Blob
  fileName?: string
  docType?: string
  caseId?: string
  label: string
  coalesceKey?: string
  createdAt: number
  attempts: number
  lastError?: string
}

export type Sender = (op: OutboxOp) => Promise<unknown>
export type NewOp = Omit<OutboxOp, 'id' | 'seq' | 'createdAt' | 'attempts'> & { id?: string }

export interface FlushReport { sent: number; failed: number; left: number; stoppedByNetwork: boolean }

const DB = 'sahara-outbox'
const STORE = 'ops'

export function createOutbox(send: Sender, dbName = DB) {
  let dbp: Promise<IDBPDatabase> | null = null
  const db = () => (dbp ??= openDB(dbName, 1, { upgrade(d) { d.createObjectStore(STORE, { keyPath: 'id' }) } }))
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((l) => l())
  let flushing: Promise<FlushReport> | null = null
  let inFlightId: string | null = null
  let seqCounter = 0
  const failed: { op: OutboxOp; error: string }[] = []

  async function list(): Promise<OutboxOp[]> {
    const all = (await (await db()).getAll(STORE)) as OutboxOp[]
    return all.sort((a, b) => a.seq - b.seq)
  }

  async function enqueue(input: NewOp): Promise<OutboxOp> {
    const d = await db()
    const all = await list()
    if (!seqCounter) seqCounter = all.reduce((m, o) => Math.max(m, o.seq), 0)
    if (input.coalesceKey) {
      for (const o of all) if (o.coalesceKey === input.coalesceKey && o.id !== inFlightId) await d.delete(STORE, o.id)
    }
    const op: OutboxOp = { ...input, id: input.id ?? newKey(), seq: ++seqCounter, createdAt: Date.now(), attempts: 0 }
    await d.put(STORE, op)
    emit()
    return op
  }

  async function pendingForCase(caseId: string) {
    return (await list()).filter((o) => o.caseId === caseId)
  }

  async function runFlush(): Promise<FlushReport> {
    const report: FlushReport = { sent: 0, failed: 0, left: 0, stoppedByNetwork: false }
    const d = await db()
    for (const op of await list()) {
      inFlightId = op.id
      try {
        await send(op)
        await d.delete(STORE, op.id)
        report.sent++
      } catch (e) {
        const retryable = e instanceof NetworkError || (e instanceof ApiError && (e.status >= 500 || e.status === 408 || e.status === 429))
        op.attempts++
        op.lastError = e instanceof Error ? e.message : 'error'
        if (retryable) {
          await d.put(STORE, op)
          report.stoppedByNetwork = true
          break // keep the order: do not send later ops before this one
        }
        // a final "no" (for example 422 or 403): drop it and show it to the user
        await d.delete(STORE, op.id)
        failed.push({ op, error: op.lastError })
        report.failed++
      } finally {
        inFlightId = null
      }
    }
    report.left = (await list()).length
    emit()
    return report
  }

  /** Send everything that waits. Only one flush runs at a time. */
  function flush(): Promise<FlushReport> {
    flushing ??= runFlush().finally(() => { flushing = null })
    return flushing
  }

  return {
    enqueue,
    list,
    flush,
    pendingForCase,
    failed: () => failed.slice(),
    clearFailed: () => { failed.length = 0; emit() },
    subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } },
    async clear() { await (await db()).clear(STORE); emit() },
  }
}

export type Outbox = ReturnType<typeof createOutbox>
