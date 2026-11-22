// What she reads and hears when staff ask her for a paper. The four standard sentences come in both languages with a
// recorded voice (also for decisions saved before the Urdu text existed); anything the admin typed stays as typed.
import en from '../../../i18n/en.json'
import type { DecisionCard } from '../../../api/types'

type Dict = Record<string, string>
export function staffMessage(d: DecisionCard, lang: 'en' | 'ur', t: (k: string) => string): { text: string; key: string } {
  const e = d.explain_citizen
  const kinds = ['cnic_front', 'cnic_back', 'cnic_both', 'other']
  const std = e.std ?? kinds.find((k) => (en as Dict)[`prompt.staff_ask_${k}`]?.trim().toLowerCase() === e.en.trim().toLowerCase())
  if (std) return { text: t(`prompt.staff_ask_${std}`), key: `staff_ask_${std}` }
  return { text: e[lang] || e.en, key: `staff_message_${d.decision_id}` }
}
