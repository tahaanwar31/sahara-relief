import { chromium } from 'playwright-core'
const API = 'http://localhost:8000'
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const run = async (email, steps) => {
  const r = await (await fetch(API + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, secret: '246810' }) })).json()
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US' })
  await ctx.addInitScript(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('sahara.lang', 'en') }, ['sahara.auth', JSON.stringify({ token: r.access_token, user: r.user, exp: Date.now() + 3600e3 })])
  const p = await ctx.newPage(); await p.goto('http://localhost:5173/#/claim'); await p.waitForTimeout(4000)
  await steps(p); await ctx.close()
}
await run('zainab@citizens.sahara.test', async (p) => {
  await p.getByRole('button', { name: /See my answer/i }).click().catch(() => {}); await p.waitForTimeout(3500)
  await p.screenshot({ path: '.shots/r-result.png' })
})
await run('fam-abc0e0aa070a@citizens.sahara.test', async (p) => {
  await p.screenshot({ path: '.shots/r-step1.png' })
  await p.getByRole('button', { name: /Yes, start/i }).click().catch(() => {}); await p.waitForTimeout(2500)
  await p.screenshot({ path: '.shots/r-step2.png' })
})
await b.close()
