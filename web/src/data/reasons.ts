// Reason codes (copied from shared/reasons.json). The service sends codes; the web app shows these texts.
import raw from './reasons.json'
import type { Lang, Zone } from '../api/types'

interface Entry { zone?: Zone; en: string; ur: string }
const decision = raw.decision as Record<string, Entry>
const scam = raw.scam as Record<string, Entry>

export const reasonCodes = Object.keys(decision)
export const scamCodes = Object.keys(scam)

export function reasonText(code: string | null | undefined, lang: Lang, fallback?: { en?: string; ur?: string }): string {
  const e = code ? decision[code] : undefined
  if (e) return e[lang]
  return (fallback && (fallback[lang] || fallback.en)) || (lang === 'ur' ? 'مزید جانچ ضروری ہے۔' : 'More checking is needed.')
}
export function reasonZone(code: string): Zone | undefined { return decision[code]?.zone }
export function scamText(code: string, lang: Lang, fallback?: { en?: string; ur?: string }): string {
  const e = scam[code]
  return e ? e[lang] : (fallback?.[lang] ?? fallback?.en ?? code)
}
export const allReasons = decision
export const allScam = scam

// Staff screens talk ABOUT the person ("this person"), not TO her. English only, like the staff screens.
const STAFF: Record<string, string> = {
  R_AUTO_APPROVED: 'All checks passed with high confidence. Approved automatically.',
  R_CONSENT_MISSING: 'No active consent. Details cannot be read until she agrees.',
  R_CNIC_INVALID: 'The ID number is not valid.',
  R_CNIC_EXPIRED: 'The ID card has expired.',
  R_DECEASED: 'The records show a deceased flag for this person.',
  R_DUPLICATE_IDENTITY: 'This person may be in the records twice. Check before any payment.',
  R_NAME_AMBIGUOUS: 'The name matches more than one record.',
  R_PMT_ABOVE_CUTOFF: 'Household score is above the programme limit. Confirm.',
  R_PMT_BORDERLINE: 'Household score is close to the limit. Review.',
  R_PMT_MISSING: 'No household score on record.',
  R_EXCLUSION_HIT: 'An exclusion rule matched this household. Review.',
  R_DOC_MISSING: 'A required paper is missing.',
  R_DOC_BLURRY: 'A photo is too blurry to read.',
  R_DOC_LOW_CONFIDENCE: 'The paper could not be read with enough confidence.',
  R_DOC_EDITED: 'A paper shows signs of editing. Review.',
  R_PAYOUT_ACCOUNT_SHARED: 'The payout account is used by other families.',
  R_PAYOUT_ACCOUNT_CHANGED: 'The payout account was changed recently.',
  R_PAYOUT_HELPER_OWNED: 'The payout account belongs to a helper, not to the claimant.',
  R_PAYOUT_OVER_CAP: 'Payment is over the cap. A second approver is needed.',
  R_CHECKS_DISAGREE: 'The automatic checks disagree with each other.',
  R_MISSING_FIELDS: 'Some required details are missing.',
  R_SCAM_FLAG: 'The claim looks like it may involve a scam. Review carefully.',
  R_LOW_CONFIDENCE: 'The system is not sure. A person must decide.',
  R_LIKELY_NOT_ELIGIBLE: 'The rules suggest she may not qualify. Confirm and explain.',
}
const STAFF_UR: Record<string, string> = {
  R_AUTO_APPROVED: 'تمام جانچ بھرپور یقین کے ساتھ پوری ہوئیں۔ خود بخود منظور۔',
  R_CONSENT_MISSING: 'اجازت موجود نہیں۔ جب تک وہ متفق نہ ہوں تفصیل نہیں دیکھی جا سکتی۔',
  R_CNIC_INVALID: 'شناختی کارڈ نمبر درست نہیں ہے۔',
  R_CNIC_EXPIRED: 'شناختی کارڈ کی مدت ختم ہو چکی ہے۔',
  R_DECEASED: 'ریکارڈ میں اس شخص کے سامنے وفات کا نشان ہے۔',
  R_DUPLICATE_IDENTITY: 'یہ شخص ریکارڈ میں دو بار ہو سکتا ہے۔ ادائیگی سے پہلے جانچ کریں۔',
  R_NAME_AMBIGUOUS: 'نام ایک سے زیادہ ریکارڈ سے ملتا ہے۔',
  R_PMT_ABOVE_CUTOFF: 'گھرانے کا اسکور پروگرام کی حد سے اوپر ہے۔ تصدیق کریں۔',
  R_PMT_BORDERLINE: 'گھرانے کا اسکور حد کے بہت قریب ہے۔ جائزہ لیں۔',
  R_PMT_MISSING: 'گھرانے کا اسکور ریکارڈ میں نہیں ہے۔',
  R_EXCLUSION_HIT: 'اس گھرانے پر ایک خارج کرنے والا اصول لاگو ہوا۔ جائزہ لیں۔',
  R_DOC_MISSING: 'ایک ضروری کاغذ موجود نہیں۔',
  R_DOC_BLURRY: 'ایک تصویر پڑھنے کے لیے بہت دھندلی ہے۔',
  R_DOC_LOW_CONFIDENCE: 'کاغذ کافی یقین کے ساتھ پڑھا نہیں جا سکا۔',
  R_DOC_EDITED: 'ایک کاغذ میں تبدیلی کے آثار ہیں۔ جائزہ لیں۔',
  R_PAYOUT_ACCOUNT_SHARED: 'ادائیگی کا اکاؤنٹ دوسرے گھرانے بھی استعمال کر رہے ہیں۔',
  R_PAYOUT_ACCOUNT_CHANGED: 'ادائیگی کا اکاؤنٹ حال ہی میں بدلا گیا ہے۔',
  R_PAYOUT_HELPER_OWNED: 'ادائیگی کا اکاؤنٹ مددگار کا ہے، درخواست گزار کا نہیں۔',
  R_PAYOUT_OVER_CAP: 'رقم حد سے زیادہ ہے۔ دوسرے منظور کنندہ کی ضرورت ہے۔',
  R_CHECKS_DISAGREE: 'خودکار جانچیں ایک دوسرے سے متفق نہیں۔',
  R_MISSING_FIELDS: 'کچھ ضروری تفصیلات موجود نہیں۔',
  R_SCAM_FLAG: 'دعوے میں فراڈ کا شبہ ہے۔ احتیاط سے جائزہ لیں۔',
  R_LOW_CONFIDENCE: 'نظام کو یقین نہیں۔ فیصلہ کسی انسان کو کرنا ہوگا۔',
  R_LIKELY_NOT_ELIGIBLE: 'قواعد کے مطابق شاید وہ اہل نہ ہوں۔ تصدیق کر کے وضاحت کریں۔',
}
export function staffReason(code: string | null | undefined, lang: Lang = 'en'): string {
  const t = lang === 'ur' ? STAFF_UR : STAFF
  return (code && t[code]) || (lang === 'ur' ? 'مزید جانچ ضروری ہے۔' : 'More checking is needed.')
}
