import { chromium } from 'playwright-core'
const API = 'http://localhost:8000'
const login = async (email, secret) => (await fetch(API + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, secret }) })).json()
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const open = async (email, secret, hash, name, extra) => {
  const r = await login(email, secret)
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' })
  await ctx.addInitScript(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('sahara.lang', 'en') }, ['sahara.auth', JSON.stringify({ token: r.access_token, user: r.user, exp: Date.now() + 3600e3 })])
  const p = await ctx.newPage(); await p.goto('http://localhost:5173/' + hash); await p.waitForTimeout(5000)
  if (extra) await extra(p)
  await p.screenshot({ path: `.shots/s-${name}.png`, fullPage: false }); await ctx.close()
}
const O = ['admin1@gov.sahara.test', 'Admin#2026'], A = ['admin@gov.sahara.test', 'Admin#2026'], U = ['admin@gov.sahara.test', 'Admin#2026']
await open(...O, '#/queue', 'queue')
await open(...O, '#/queue', 'case', async (p) => { await p.getByTestId('queue-row').first().click(); await p.waitForTimeout(4000) })
await open(...A, '#/rules', 'rules')
await open(...A, '#/policy', 'policy')
await open(...A, '#/twin', 'twin', async (p) => { await p.getByRole('button', { name: /Run the replay/i }).click().catch(() => {}); await p.waitForTimeout(9000) })
await open(...A, '#/eval', 'eval')
await open(...U, '#/audit', 'audit')
await b.close()
console.log('ok')
