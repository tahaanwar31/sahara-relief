import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { LangProvider } from '../src/i18n'
import { ResultCard } from '../src/pages/citizen/claim/ResultCard'
import { SpeakButton } from '../src/components/SpeakButton'
import { playPrompt } from '../src/audio/playPrompt'
import type { DecisionCard } from '../src/api/types'
import reasons from '../src/data/reasons.json'
import en from '../src/i18n/en.json'
import ur from '../src/i18n/ur.json'

const card = (zone: DecisionCard['zone'], code: string): DecisionCard => ({
  decision_id: 'd', case_id: 'c', created_at: '2026-11-21T10:00:00Z', actor_type: 'ai', zone,
  result: zone === 'AUTO' ? 'APPROVE' : zone === 'HUMAN' ? 'HUMAN_REVIEW' : 'ASK_PROOF', reason_code: code, confidence: 0.6, rule_version: 1,
  checks: [], explain_citizen: { en: 'x', ur: 'y' }, trace: [], next_step: { type: 'x', doc_type: 'utility_bill' },
})
const wrap = (lang: 'ur' | 'en', zone: DecisionCard['zone'], code: string) =>
  render(<LangProvider initialLang={lang}><ResultCard decision={card(zone, code)} amount={13500} quarter="2026-Q4" /></LangProvider>)

describe('result card', () => {
  it('AUTO: word, Urdu reason from the code, right-to-left, amount', () => {
    wrap('ur', 'AUTO', 'R_AUTO_APPROVED')
    expect(screen.getByTestId('result-card')).toHaveAttribute('data-zone', 'AUTO')
    expect(screen.getByTestId('result-reason')).toHaveTextContent(reasons.decision.R_AUTO_APPROVED.ur)
    expect(screen.getByTestId('result-headline')).toHaveTextContent(ur['result.AUTO.title'])
    expect(document.documentElement.dir).toBe('rtl')
    expect(screen.getByText(/13,500/)).toBeInTheDocument()
  })
  it('ASK_MORE: names the paper and offers to send it; English is left-to-right', () => {
    wrap('en', 'ASK_MORE', 'R_DOC_BLURRY')
    expect(screen.getByTestId('result-reason')).toHaveTextContent(reasons.decision.R_DOC_BLURRY.en)
    expect(screen.getByText(/Income letter or recent bill/)).toBeInTheDocument()
    expect(document.documentElement.dir).toBe('ltr')
  })
  it('HUMAN: says "I am not sure" and what happens next, with a date', () => {
    wrap('en', 'HUMAN', 'R_LOW_CONFIDENCE')
    expect(screen.getByTestId('result-headline')).toHaveTextContent(/not sure/i)
    expect(screen.getByTestId('what-next')).toHaveTextContent(/2026/)
  })
  it('audio: with no file and no voice it shows the text, and never throws', async () => {
    const r = await playPrompt('R_NOT_THERE', 'ur', 'hello')
    expect(r.mode).toBe('text')
    render(<LangProvider initialLang="en"><SpeakButton promptKey="x" text="Say this loudly" /></LangProvider>)
    screen.getByRole('button').click()
    expect(await screen.findByTestId('audio-text-fallback')).toHaveTextContent('Say this loudly')
  })
})

describe('dictionaries', () => {
  const files: string[] = []
  const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(f)) files.push(p) } }
  walk(join(__dirname, '..', 'src'))
  it('every t() key used in the code exists in both languages', () => {
    const keys = new Set<string>()
    for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) keys.add(m[1])
    const E = en as Record<string, string>, U = ur as Record<string, string>
    expect([...keys].filter((k) => !(k in E) || !(k in U))).toEqual([])
  })
  it('both dictionaries have the same keys', () => {
    expect(Object.keys(ur).filter((k) => k !== '_note').sort()).toEqual(Object.keys(en).sort())
  })
})
