// Step 5: one paper per screen. Photo is shrunk in the browser, sent (or kept on the phone until there is signal),
// and the blur check comes from the service signals. "Try again" is one big button.
import { useRef, useState } from 'react'
import { Btn, Notice } from '../../../components/ui'
import { Icon } from '../../../components/Icon'
import { SpeakButton } from '../../../components/SpeakButton'
import { compressImage } from '../../../components/image'
import { useLang } from '../../../i18n'
import { uploadDocument } from '../../../offline/runtime'
import { errorText } from '../../../api'
import type { DocType } from '../../../api/types'

export type DocState = 'ok' | 'queued' | 'blurry' | 'wrongside' | 'suspicious' | 'skipped'
export type DocsDraft = Partial<Record<DocType, DocState>>

interface Props {
  caseId: string
  docs: DocType[]
  state: DocsDraft
  onChange: (next: DocsDraft) => void
}

export function DocsStep({ caseId, docs, state, onChange }: Props) {
  const { t, lang } = useLang()
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<Record<string, string>>({})
  const [wrongSide, setWrongSide] = useState('')

  const done = (d: DocType) => ['ok', 'queued', 'suspicious', 'skipped'].includes(state[d] ?? '')
  const current = docs.find((d) => !done(d)) ?? docs[docs.length - 1]
  const cs = state[current]

  async function pick(file: File | undefined) {
    if (!file) return
    setBusy(true); setError('')
    try {
      const small = await compressImage(file)
      const url = URL.createObjectURL(small)
      setPreview((p) => ({ ...p, [current]: url }))
      const r = await uploadDocument(caseId, small, file.name || 'photo.jpg', current)
      if (r.queued) onChange({ ...state, [current]: 'queued' })
      else if ((r.analysis.signals as { card?: { wrong_side?: string } } | undefined)?.card?.wrong_side) {
        setWrongSide((r.analysis.signals as { card: { wrong_side: string } }).card.wrong_side)
        onChange({ ...state, [current]: 'wrongside' })
      } else if (r.analysis.signals?.is_blurry || r.analysis.verdict === 'ask_better_photo') onChange({ ...state, [current]: 'blurry' })
      else if (r.analysis.verdict === 'suspicious') onChange({ ...state, [current]: 'suspicious' })
      else onChange({ ...state, [current]: 'ok' })
    } catch (e) {
      setError(errorText(e, lang))
    } finally {
      setBusy(false)
      if (camera.current) camera.current.value = ''
      if (gallery.current) gallery.current.value = ''
    }
  }

  const idx = docs.indexOf(current) + 1
  return (
    <div className="space-y-4" data-testid="docs-step">
      {docs.length > 1 && <p className="text-muted font-semibold">{t('docs.count', { n: idx, total: docs.length })}</p>}
      <div className="rounded-2xl bg-brand-soft p-5 text-center">
        <Icon name="doc" size={48} className="mx-auto text-brand" />
        <p className="mt-2 text-xl font-semibold" data-testid="doc-title">{t(`doc.${current}.ask`)}</p>
        <SpeakButton className="mt-3 flex justify-center flex-col items-center" promptKey={`doc_${current}`} text={t(`doc.${current}.ask`)} />
      </div>

      {preview[current] && cs && cs !== 'skipped' && <img src={preview[current]} alt="" className="mx-auto max-h-48 rounded-xl border border-line" />}

      {cs === 'ok' && <Notice tone="auto" icon="check"><b>{t('docs.ok')}</b></Notice>}
      {cs === 'queued' && <Notice tone="human" icon="phone"><b>{t('save.phone')}</b></Notice>}
      {cs === 'suspicious' && <Notice tone="human" icon="person">{t('docs.suspicious')}</Notice>}
      {cs === 'blurry' && (
        <Notice tone="ask" icon="warning">
          <b>{t('docs.blurry')}</b>
          <SpeakButton className="mt-2" promptKey="R_DOC_BLURRY" text={t('docs.blurry')} />
        </Notice>
      )}
      {cs === 'wrongside' && <Notice tone="ask" icon="warning"><b>{t(wrongSide === 'back' ? 'docs.wrong_back' : 'docs.wrong_front')}</b></Notice>}
      {error && <Notice tone="danger" icon="warning">{error}</Notice>}

      {docs.length > 1 && (
        <ul className="flex gap-2 justify-center" aria-label="papers">
          {docs.map((d) => <li key={d} className={`h-2.5 w-10 rounded-full ${done(d) ? 'bg-auto' : d === current ? 'bg-brand' : 'bg-line'}`} />)}
        </ul>
      )}

      {(!cs || cs === 'blurry' || cs === 'wrongside' || cs === 'skipped') && (
        <div className="space-y-3">
          <input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only" aria-label={t('docs.camera')} data-testid="file-camera" onChange={(e) => void pick(e.target.files?.[0])} />
          <input ref={gallery} type="file" accept="image/*" className="sr-only" aria-label={t('docs.gallery')} data-testid="file-gallery" onChange={(e) => void pick(e.target.files?.[0])} />
          <Btn block icon="camera" disabled={busy} onClick={() => camera.current?.click()}>
            {busy ? t('common.wait') : (cs as string | undefined) === 'blurry' || (cs as string | undefined) === 'wrongside' ? t('docs.again') : t('docs.camera')}
          </Btn>
          <div className="flex gap-3">
            <Btn variant="secondary" small className="flex-1" icon="upload" disabled={busy} onClick={() => gallery.current?.click()}>{t('docs.gallery')}</Btn>
            <Btn variant="ghost" small className="flex-1" disabled={busy} onClick={() => onChange({ ...state, [current]: 'skipped' })}>{t('docs.skip')}</Btn>
          </div>
        </div>
      )}
      {cs === 'skipped' && <Notice tone="ask" icon="info">{t('docs.skipped')}</Notice>}
    </div>
  )
}
