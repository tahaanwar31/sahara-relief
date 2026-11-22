import { chromium } from 'playwright-core'
const API = 'http://localhost:8000'
const r = await (await fetch(API + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'admin1@gov.sahara.test', secret: 'Admin#2026' }) })).json()
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const ctx = await b.newContext({ viewport: { width: 1280, height: 1500 } })
await ctx.addInitScript(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('sahara.lang', 'en') }, ['sahara.auth', JSON.stringify({ token: r.access_token, user: r.user, exp: Date.now() + 3600e3 })])
const p = await ctx.newPage(); await p.goto('http://localhost:5173/#/queue')
await p.getByTestId('queue-row').first().waitFor({ timeout: 30000 }); await p.getByTestId('queue-row').first().click()
await p.getByRole('heading', { name: 'Decision card' }).waitFor({ timeout: 30000 }); await p.waitForTimeout(3000)
await p.screenshot({ path: '.shots/case.png' }); await b.close()
