// The small json-logic subset used by the rules (CONTRACT.md section 6):
//   var  ==  !=  <  <=  >  >=  and  or  !  in  missing
// Used by the rule editor (friendly form + validation messages) and by the mock service.

export type VarType = 'number' | 'boolean' | 'string'
export const FACTS: { name: string; label: string; type: VarType }[] = [
  { name: 'person.gender', label: 'Person: gender', type: 'string' },
  { name: 'person.cnic_valid', label: 'Person: ID number is valid', type: 'boolean' },
  { name: 'person.cnic_expired', label: 'Person: ID card has expired', type: 'boolean' },
  { name: 'person.deceased', label: 'Person: marked deceased', type: 'boolean' },
  { name: 'person.age', label: 'Person: age in years', type: 'number' },
  { name: 'household.pmt_score', label: 'Household: poverty score', type: 'number' },
  { name: 'household.members', label: 'Household: number of people', type: 'number' },
  { name: 'household.flags.gov_employee', label: 'Household: has a government employee', type: 'boolean' },
  { name: 'household.flags.owns_vehicle', label: 'Household: owns a vehicle', type: 'boolean' },
  { name: 'household.flags.tax_filer', label: 'Household: files tax', type: 'boolean' },
  { name: 'household.flags.foreign_trips', label: 'Household: foreign trips', type: 'boolean' },
  { name: 'household.flags.high_phone_bill', label: 'Household: high phone bill', type: 'boolean' },
  { name: 'payout.shared_with_other_households', label: 'Payout: account shared with other families', type: 'boolean' },
  { name: 'payout.changed_within_days', label: 'Payout: days since account changed', type: 'number' },
  { name: 'payout.owner_is_helper', label: 'Payout: account belongs to a helper', type: 'boolean' },
  { name: 'doc.required_missing', label: 'Papers: a required paper is missing', type: 'boolean' },
  { name: 'doc.any_blurry', label: 'Papers: a photo is blurry', type: 'boolean' },
  { name: 'doc.any_edited', label: 'Papers: signs of editing', type: 'boolean' },
  { name: 'doc.min_confidence', label: 'Papers: lowest reading confidence', type: 'number' },
  { name: 'identity.band', label: 'Identity: match band (SAME/MAYBE/DIFFERENT)', type: 'string' },
  { name: 'identity.score', label: 'Identity: match score', type: 'number' },
  { name: 'claim.amount', label: 'Claim: amount', type: 'number' },
]
const FACT_NAMES = new Set(FACTS.map((f) => f.name))

export const OPS = ['==', '!=', '<', '<=', '>', '>=', 'and', 'or', '!', 'in', 'missing', 'var'] as const
const COMPARE = new Set(['==', '!=', '<', '<=', '>', '>='])

export interface Problem { path: string; message: string }

function isLiteral(x: unknown) { return x === null || ['number', 'string', 'boolean'].includes(typeof x) }

/** Returns a list of plain-words problems. Empty list = the expression is fine. */
export function validateExpression(expr: unknown, path = 'expression'): Problem[] {
  const out: Problem[] = []
  const walk = (e: unknown, p: string) => {
    if (isLiteral(e)) return
    if (Array.isArray(e)) { e.forEach((x, i) => walk(x, `${p}[${i}]`)); return }
    if (typeof e !== 'object' || e === null) { out.push({ path: p, message: 'This is not a valid value.' }); return }
    const keys = Object.keys(e)
    if (keys.length !== 1) { out.push({ path: p, message: 'Each block must have exactly one operator (for example "and" or "==").' }); return }
    const op = keys[0]
    const arg = (e as Record<string, unknown>)[op]
    if (!(OPS as readonly string[]).includes(op)) { out.push({ path: p, message: `"${op}" is not allowed here. Use one of: ${OPS.join(', ')}.` }); return }
    if (op === 'var') {
      const name = Array.isArray(arg) ? arg[0] : arg
      if (typeof name !== 'string') out.push({ path: p, message: 'A variable needs a name, for example "household.pmt_score".' })
      else if (!FACT_NAMES.has(name)) out.push({ path: p, message: `Unknown variable "${name}".` })
      return
    }
    if (op === 'missing') {
      if (!Array.isArray(arg) || arg.length === 0 || arg.some((n) => typeof n !== 'string' || !FACT_NAMES.has(n))) out.push({ path: p, message: '"missing" needs a list of known variable names.' })
      return
    }
    if (!Array.isArray(arg)) { out.push({ path: p, message: `"${op}" needs a list of operands.` }); return }
    if (COMPARE.has(op) && arg.length !== 2) out.push({ path: p, message: `"${op}" compares exactly two things.` })
    if ((op === 'and' || op === 'or') && arg.length < 2) out.push({ path: p, message: `"${op}" needs at least two conditions.` })
    if (op === '!' && arg.length !== 1) out.push({ path: p, message: '"!" (not) takes exactly one condition.' })
    if (op === 'in' && (arg.length !== 2 || !(Array.isArray(arg[1]) || typeof arg[1] === 'string'))) out.push({ path: p, message: '"in" needs a value and a list (or text) to look in.' })
    arg.forEach((x, i) => walk(x, `${p}.${op}[${i}]`))
  }
  walk(expr, path)
  return out
}

// ---- friendly form model: a list of simple conditions joined by AND or OR ----
export type SimpleOp = '==' | '!=' | '<' | '<=' | '>' | '>=' | 'missing'
export interface Cond { variable: string; op: SimpleOp; value: string }
export interface SimpleModel { join: 'and' | 'or'; conds: Cond[] }

const literalToText = (v: unknown) => (v === null ? 'null' : String(v))
export function textToLiteral(s: string): unknown {
  const t = s.trim()
  if (t === 'true') return true
  if (t === 'false') return false
  if (t === 'null') return null
  if (t !== '' && !isNaN(Number(t))) return Number(t)
  return t
}

function condFrom(e: unknown): Cond | null {
  if (typeof e !== 'object' || e === null) return null
  const [op] = Object.keys(e)
  const arg = (e as Record<string, unknown>)[op]
  if (op === 'missing' && Array.isArray(arg) && arg.length === 1 && typeof arg[0] === 'string') return { variable: arg[0], op: 'missing', value: '' }
  if (COMPARE.has(op) && Array.isArray(arg) && arg.length === 2) {
    const [a, b] = arg
    if (typeof a === 'object' && a !== null && 'var' in a && isLiteral(b)) {
      const v = (a as { var: unknown }).var
      return { variable: String(Array.isArray(v) ? v[0] : v), op: op as SimpleOp, value: literalToText(b) }
    }
  }
  return null
}

/** Turn an expression into the friendly form, or null if it is too complex (then edit as text). */
export function toSimple(expr: unknown): SimpleModel | null {
  if (typeof expr !== 'object' || expr === null) return null
  const [op] = Object.keys(expr)
  if (op === 'and' || op === 'or') {
    const arg = (expr as Record<string, unknown[]>)[op]
    const conds = arg.map(condFrom)
    return conds.every(Boolean) ? { join: op, conds: conds as Cond[] } : null
  }
  const c = condFrom(expr)
  return c ? { join: 'and', conds: [c] } : null
}

export function fromSimple(m: SimpleModel): unknown {
  const parts = m.conds.map((c) => (c.op === 'missing' ? { missing: [c.variable] } : { [c.op]: [{ var: c.variable }, textToLiteral(c.value)] }))
  return parts.length === 1 ? parts[0] : { [m.join]: parts }
}

/** Plain-words sentence for an expression (shown under the form). */
export function describe(expr: unknown): string {
  const m = toSimple(expr)
  if (!m) return 'A custom rule (see the technical text).'
  const word: Record<SimpleOp, string> = { '==': 'is', '!=': 'is not', '<': 'is less than', '<=': 'is at most', '>': 'is more than', '>=': 'is at least', missing: 'is missing' }
  const lab = (v: string) => FACTS.find((f) => f.name === v)?.label ?? v
  return m.conds.map((c) => `${lab(c.variable)} ${word[c.op]}${c.op === 'missing' ? '' : ' ' + c.value}`).join(m.join === 'and' ? ' AND ' : ' OR ')
}
