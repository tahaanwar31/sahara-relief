// Lists every spoken prompt (key, language, text, target file) as JSON for the audio generator.
// Usage: node scripts/audio_manifest.mjs [--out audio_manifest.json]
// Files are expected at public/audio/<lang>/<key>.mp3
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const rd = (p) => JSON.parse(readFileSync(join(here, '..', p), 'utf8'))
const dict = { en: rd('src/i18n/en.json'), ur: rd('src/i18n/ur.json') }
const reasons = rd('src/data/reasons.json')

const prompts = []
const add = (key, lang, text) => text && prompts.push({ key, lang, text, file: `audio/${lang}/${key}.mp3` })

for (const lang of ['ur', 'en']) {
  // step texts and screen prompts: prompt.<key> in the dictionaries
  for (const [k, v] of Object.entries(dict[lang])) if (k.startsWith('prompt.')) add(k.slice(7), lang, v)
  // paper prompts: doc_<type>
  for (const [k, v] of Object.entries(dict[lang])) if (/^doc\.[a-z_]+\.ask$/.test(k)) add('doc_' + k.split('.')[1], lang, v)
  // result card: one file per reason code (headline + reason text)
  for (const [code, r] of Object.entries(reasons.decision)) add(code, lang, r[lang])
  // scam advice
  add('R_DOC_BLURRY', lang, reasons.decision.R_DOC_BLURRY[lang])
  for (const [code, r] of Object.entries(reasons.scam)) add('scam_' + code, lang, r[lang])
  for (const l of ['safe', 'suspicious', 'scam']) add('scam_' + l, lang, dict[lang]['scam.' + l])
}
const seen = new Set()
const unique = prompts.filter((p) => !seen.has(p.file) && seen.add(p.file))
const out = JSON.stringify({ generated: new Date().toISOString(), count: unique.length, prompts: unique }, null, 2)
const i = process.argv.indexOf('--out')
if (i > 0) writeFileSync(process.argv[i + 1], out)
else console.log(out)
