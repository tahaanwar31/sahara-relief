import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const p = await b.newPage({ viewport: { width: 794, height: 900 } })
await p.goto('file:///C:/Users/Talha/Desktop/Hackathon/Coders%20Cup%2026/sahara-relief/docs/gen/manual.html'); await p.waitForTimeout(800)
const h = p.locator('h1', { hasText: 'Appendix C' }); await h.scrollIntoViewIfNeeded(); await p.screenshot({ path: '.shots/m-urdu.png' })
const t = p.locator('h2', { hasText: 'A.2' }); await p.locator('.toc').first().screenshot({ path: '.shots/m-toc.png' })
await b.close()
