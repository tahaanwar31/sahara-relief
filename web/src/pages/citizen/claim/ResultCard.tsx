// Step 8: the answer. Always a big icon, a colour AND a word for the zone, the reason in the chosen language,
// a play-audio button, and for "a person will look" a plain "what happens next" line with a date.
import { Btn, ZONE_LOOK, money, fmtDate } from '../../../components/ui'
import { Icon } from '../../../components/Icon'
import { SpeakButton } from '../../../components/SpeakButton'
import { useLang } from '../../../i18n'
import { reasonText } from '../../../data/reasons'
import { staffMessage } from './staffMessage'
import type { DecisionCard } from '../../../api/types'

const DAY = 86400_000
export function humanDueDate(d: DecisionCard): string {
  return d.next_step?.due_date || new Date(new Date(d.created_at).getTime() + 3 * DAY).toISOString()
}

interface Props {
  decision: DecisionCard
  quarter?: string
  amount?: number
  onSendMore?: (docType: string | null | undefined) => void
  onDone?: () => void
}

export function ResultCard({ decision, quarter, amount, onSendMore, onDone }: Props) {
  const { lang, t } = useLang()
  const z = ZONE_LOOK[decision.zone]
  // when a staff member asked for a paper, she reads THEIR message (and it is read aloud as written, not the recorded standard text)
  const fromStaff = decision.explain_citizen.officer === '1'
  const staff = fromStaff ? staffMessage(decision, lang, t) : null
  const reason = staff ? staff.text : reasonText(decision.reason_code, lang, decision.explain_citizen)
  const headline = t(`result.${decision.zone}.title`)
  const spoken = `${headline}. ${reason}`
  const docType = decision.next_step?.doc_type

  return (
    <div className="space-y-5" data-testid="result-card" data-zone={decision.zone}>
      {decision.zone === 'AUTO' ? (
        <div className="rounded-[26px] p-7 text-center text-white" style={{ background: '#2B2420' }}>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand px-3.5 py-1.5 text-sm font-semibold text-white" data-testid="result-headline">
            <Icon name="check" size={18} stroke={3} /> {headline}
          </span>
          {amount != null && (
            <>
              <p className="mt-5 text-white/65">{t('result.AUTO.amount')}</p>
              <p className="ltr mt-1 text-[44px] font-extrabold leading-none tracking-tight">{money(amount)}</p>
              {quarter && <p className="ltr mt-2 text-sm text-white/55">{quarter}</p>}
            </>
          )}
          <p className="mt-5 text-lg leading-relaxed text-white/85" data-testid="result-reason">{reason}</p>
        </div>
      ) : (
        <div className="rounded-card border border-line bg-white p-7 text-center shadow-card">
          <div className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${z.bg} ${z.fg}`} aria-hidden="true">
            <Icon name={z.icon} size={40} stroke={2.4} />
          </div>
          <h1 className={`mt-4 ${z.fg}`} data-testid="result-headline">{headline}</h1>
          <p className="mt-3 text-lg leading-relaxed text-ink" data-testid="result-reason">{reason}</p>
          {decision.zone === 'ASK_MORE' && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ask-soft px-4 py-2 text-lg font-semibold text-ask">
              <Icon name="doc" /> {t('result.ASK_MORE.need')}: {docType === 'cnic_both' ? `${t('doc.cnic_front')} + ${t('doc.cnic_back')}` : docType ? t(`doc.${docType}`) : t('doc.other')}
            </p>
          )}
          {decision.zone === 'HUMAN' && (
            <div className="mt-4 rounded-2xl bg-paper p-4 text-start" data-testid="what-next">
              <p className="flex items-center gap-2 font-semibold text-human"><Icon name="clock" size={20} /> {t('result.HUMAN.next_title')}</p>
              <p className="mt-1">{t('result.HUMAN.next', { date: fmtDate(humanDueDate(decision), lang) })}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <SpeakButton bar promptKey={staff ? staff.key : decision.reason_code} text={spoken} autoPlay label={t('result.again')} />
      </div>

      <div className="flex gap-3">
        {decision.zone === 'ASK_MORE' && onSendMore && (
          <Btn className="flex-1" icon="camera" onClick={() => onSendMore(docType)}>{t('result.ASK_MORE.send')}</Btn>
        )}
        <Btn className="flex-1" variant={decision.zone === 'ASK_MORE' ? 'secondary' : 'primary'} icon="check" onClick={onDone}>{t('common.done')}</Btn>
      </div>
      <p className="text-center text-sm text-muted">{t('result.takeback')}</p>
    </div>
  )
}
