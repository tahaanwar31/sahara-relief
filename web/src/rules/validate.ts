// Checks on a rule set before it is saved: plain-words messages tied to a field path.
import type { Rule, RuleParams } from '../api/types'
import { validateExpression, type Problem } from './jsonlogic'
import { reasonCodes } from '../data/reasons'

export function validateParams(p: RuleParams): Problem[] {
  const out: Problem[] = []
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v)
  if (!num(p.cutoff) || p.cutoff < 0 || p.cutoff > 100) out.push({ path: 'params.cutoff', message: 'The cutoff must be a number between 0 and 100.' })
  if (!num(p.borderline_band) || p.borderline_band < 0 || (num(p.cutoff) && p.borderline_band >= p.cutoff)) out.push({ path: 'params.borderline_band', message: 'The borderline band must be 0 or more and smaller than the cutoff.' })
  if (!num(p.amount) || p.amount <= 0) out.push({ path: 'params.amount', message: 'The amount must be more than 0.' })
  if (!num(p.payout_cap) || p.payout_cap <= 0) out.push({ path: 'params.payout_cap', message: 'The payout cap must be more than 0.' })
  else if (num(p.amount) && p.amount > p.payout_cap) out.push({ path: 'params.amount', message: 'The amount cannot be higher than the payout cap.' })
  if (!num(p.second_approver_over) || p.second_approver_over <= 0) out.push({ path: 'params.second_approver_over', message: 'The second-approver limit must be more than 0.' })
  for (const k of ['wrong_approve', 'wrong_reject', 'review', 'proof'] as const) {
    if (!num(p.costs?.[k]) || p.costs[k] <= 0) out.push({ path: `params.costs.${k}`, message: 'Each cost must be more than 0.' })
  }
  return out
}

export function validateRules(rules: Rule[]): Problem[] {
  const out: Problem[] = []
  const seen = new Set<string>()
  rules.forEach((r, i) => {
    if (!r.code?.trim()) out.push({ path: `rules[${i}].code`, message: 'Every rule needs a name (code).' })
    else if (seen.has(r.code)) out.push({ path: `rules[${i}].code`, message: `The name "${r.code}" is used twice.` })
    seen.add(r.code)
    if (!reasonCodes.includes(r.reason_code)) out.push({ path: `rules[${i}].reason_code`, message: 'Choose one of the known reasons.' })
    if (!['PASS', 'HOLD', 'ASK_MORE'].includes(r.outcome)) out.push({ path: `rules[${i}].outcome`, message: 'Choose PASS, HOLD or ASK_MORE.' })
    validateExpression(r.expression, `rules[${i}].expression`).forEach((p) => out.push(p))
  })
  return out
}

export const validateSet = (params?: RuleParams, rules?: Rule[]): Problem[] => [...(params ? validateParams(params) : []), ...(rules ? validateRules(rules) : [])]
