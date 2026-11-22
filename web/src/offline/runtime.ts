// Wires the outbox to the real API, adds the local draft copy, and the "try now, else queue" helpers.
import { useEffect, useState, useSyncExternalStore } from 'react'
import { openDB } from 'idb'
import { api, NetworkError, request, newKey } from '../api'
import { createOutbox, type OutboxOp } from './outbox'
import { isOnline, subscribeNet } from './net'
import type { CaseDetail, DocAnalysis, DocType, DraftSaved } from '../api/types'

/** How one waiting op is really sent. */
async function send(op: OutboxOp): Promise<unknown> {
  if (op.kind === 'upload' && op.file) {
    const form = new FormData()
    form.append('file', op.file, op.fileName ?? 'photo.jpg')
    form.append('doc_type', op.docType ?? 'other')
    return request('POST', op.path, { form, idempotencyKey: op.id })
  }
  return request(op.method, op.path, { body: op.body, idempotencyKey: op.id })
}

export const outbox = createOutbox(send)

// ---- phone copy of the draft (so a reload or a dead battery loses nothing) ----
interface LocalDraft { caseId: string; step: number; draft: Record<string, unknown>; resume_code?: string; savedAt: number }
const draftDb = () => openDB('sahara-drafts', 1, { upgrade(d) { d.createObjectStore('drafts', { keyPath: 'caseId' }); d.createObjectStore('cases', { keyPath: 'id' }) } })

export async function loadLocalDraft(caseId: string): Promise<LocalDraft | undefined> {
  try { return (await (await draftDb()).get('drafts', caseId)) as LocalDraft | undefined } catch { return undefined }
}
export async function saveLocalDraft(d: LocalDraft) {
  try { await (await draftDb()).put('drafts', d) } catch { /* private mode: ignore */ }
}
export async function clearLocalDrafts() {
  try { const d = await draftDb(); await d.clear('drafts'); await d.clear('cases') } catch { /* ignore */ }
}

/** A copy of the case (name, household...) so the steps still open with no signal. */
export async function saveCaseSnap(c: CaseDetail) {
  try { await (await draftDb()).put('cases', c) } catch { /* ignore */ }
}
export async function loadCaseSnap(id: string): Promise<CaseDetail | undefined> {
  try { return (await (await draftDb()).get('cases', id)) as CaseDetail | undefined } catch { return undefined }
}

export type SaveOutcome = { saved: 'server'; resume_code: string } | { saved: 'phone' }

/** Save progress: always to the phone; to the service now if we can, else into the outbox. */
export async function saveProgress(caseId: string, step: number, draft: Record<string, unknown>, resume_code?: string): Promise<SaveOutcome> {
  await saveLocalDraft({ caseId, step, draft, resume_code, savedAt: Date.now() })
  const key = newKey()
  const waiting = (await outbox.pendingForCase(caseId)).length > 0
  if (isOnline() && !waiting) {
    try {
      const r: DraftSaved = await api.saveDraft(caseId, step, draft, key)
      await saveLocalDraft({ caseId, step, draft, resume_code: r.resume_code, savedAt: Date.now() })
      return { saved: 'server', resume_code: r.resume_code }
    } catch (e) {
      if (!(e instanceof NetworkError)) throw e
    }
  }
  await outbox.enqueue({
    id: key, kind: 'json', method: 'PUT', path: `/cases/${caseId}/draft`, body: { step, draft },
    caseId, label: 'draft', coalesceKey: `draft:${caseId}`,
  })
  return { saved: 'phone' }
}

export type UploadOutcome = { queued: false; analysis: DocAnalysis } | { queued: true }

/** Upload a photo now, or keep it (as a file in IndexedDB) until there is signal. */
export async function uploadDocument(caseId: string, file: Blob, fileName: string, docType: DocType): Promise<UploadOutcome> {
  const key = newKey()
  const waiting = (await outbox.pendingForCase(caseId)).length > 0
  if (isOnline() && !waiting) {
    try {
      return { queued: false, analysis: await api.uploadDocument(caseId, file, fileName, docType, key) }
    } catch (e) {
      if (!(e instanceof NetworkError)) throw e
    }
  }
  await outbox.enqueue({ id: key, kind: 'upload', method: 'POST', path: `/cases/${caseId}/documents`, file, fileName, docType, caseId, label: 'photo:' + docType })
  return { queued: true }
}

/** Send the claim now, or queue it. The key is stable per case so a double tap sends once. */
export async function submitClaim(caseId: string, key: string): Promise<{ queued: false } | { queued: true }> {
  const waiting = (await outbox.pendingForCase(caseId)).some((o) => o.label === 'submit')
  if (waiting) return { queued: true }
  if (isOnline()) {
    try {
      await api.submit(caseId, key)
      return { queued: false }
    } catch (e) {
      if (!(e instanceof NetworkError)) throw e
    }
  }
  await outbox.enqueue({ id: key, kind: 'json', method: 'POST', path: `/cases/${caseId}/submit`, body: {}, caseId, label: 'submit' })
  return { queued: true }
}

// ---- React hooks ----
export function useOnline(): boolean {
  return useSyncExternalStore(subscribeNet, isOnline, () => true)
}

export function useOutbox() {
  const [ops, setOps] = useState<OutboxOp[]>([])
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    const load = () => outbox.list().then((o) => { if (alive) setOps(o) }).catch(() => {})
    load()
    const off = outbox.subscribe(() => { load(); setTick((t) => t + 1) })
    return () => { alive = false; off() }
  }, [])
  return { ops, count: ops.length, tick }
}

/** Start the background flusher once (on signal back, on a timer, and at start). */
let started = false
export function startOutboxRunner() {
  if (started || typeof window === 'undefined') return
  started = true
  const go = () => { if (isOnline()) void outbox.flush().catch(() => {}) }
  window.addEventListener('online', go)
  subscribeNet(go)
  setInterval(async () => { if ((await outbox.list()).length) go() }, 8000)
  go()
}
