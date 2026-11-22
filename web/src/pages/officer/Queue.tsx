// Officer: the cases the system is "not sure" about. Highest priority first, then lowest confidence.
// The list refreshes every 10 seconds (polling, no websockets).
import { api } from '../../api'
import type { QueueItem } from '../../api/types'
import { Card, Chip, ConsentChip, ErrorBox, PageHead, Spinner, money } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { useAsync } from '../../components/useAsync'
import { useLang } from '../../i18n'
import { reasonText, staffReason } from '../../data/reasons'
import { navigate } from '../../router'

export const sortQueue = (items: QueueItem[]) => items.slice().sort((a, b) => b.priority - a.priority || a.confidence - b.confidence)

const ageText = (iso: string) => {
  const h = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3600_000))
  return h < 48 ? `${h} h` : `${Math.round(h / 24)} days`
}

export default function Queue() {
  const { lang, t } = useLang()
  const q = useAsync(() => api.queue(), [], 10000)
  const items = sortQueue(q.data ?? [])

  return (
    <div>
      <PageHead title={t('queue.title')} sub={t('queue.sub')} right={<Chip tone="brand" icon="list">{t('queue.count', { n: items.length })}</Chip>} />
      {q.loading ? <Spinner /> : q.error ? <ErrorBox error={q.error} onRetry={q.reload} /> : items.length === 0 ? (
        <Card className="text-center py-12"><Icon name="check" size={44} className="mx-auto text-auto" /><p className="mt-3 text-lg font-semibold">{t('queue.empty')}</p></Card>
      ) : (
        <ul className="space-y-3" data-testid="queue">
          {items.map((c, i) => (
            <li key={c.id}>
              <button type="button" onClick={() => navigate(`/queue/${c.id}`)} data-testid="queue-row"
                className="card w-full text-start grid gap-x-5 gap-y-2 items-center grid-cols-[auto_1fr] md:grid-cols-[auto_1.3fr_1.6fr_auto_auto] hover:border-brand/50 hover:bg-brand-soft/30 transition-colors">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-paper text-ink font-bold text-lg" title={t('queue.priority')}>{i + 1}</span>
                <span className="min-w-0">
                  <span className="block font-bold text-lg truncate">{c.person_name ?? c.person_name_ur ?? 'Name not on record'}</span>
                  {c.person_name && c.person_name_ur && <span className="block text-sm leading-relaxed text-muted">{c.person_name_ur}</span>}
                  <span className="mt-1 block text-sm leading-snug text-muted ltr">{money(c.amount)} · {c.quarter} · {ageText(c.created_at)}</span>
                </span>
                <span className="col-span-2 md:col-span-1 text-ink">{staffReason(c.reason_code, lang)}</span>
                <span className="flex items-center gap-2" aria-label={`${t('queue.confidence')} ${Math.round(c.confidence * 100)}%`}>
                  <span className="h-2.5 w-24 rounded-full bg-line overflow-hidden"><span className="block h-full bg-brand" style={{ width: `${Math.round(c.confidence * 100)}%` }} /></span>
                  <span className="ltr font-semibold tabular-nums">{Math.round(c.confidence * 100)}%</span>
                </span>
                <span className="flex flex-wrap gap-2 col-span-2 md:col-span-1 md:justify-end">
                  <ConsentChip status={c.consent_status} />
                  {c.needs_second_approver && <Chip tone="ask" icon="people">{t('queue.second')}</Chip>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
