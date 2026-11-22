import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const p = await b.newPage({ viewport: { width: 794, height: 1000 } })
await p.goto('file:///C:/Users/Talha/Desktop/Hackathon/Coders%20Cup%2026/sahara-relief/docs/gen/manual.html'); await p.waitForTimeout(800)
await p.locator('h2', { hasText: '3A. The evidence' }).scrollIntoViewIfNeeded(); await p.screenshot({ path: '.shots/m-ev1.png' })
await p.locator('h3', { hasText: '3A.12' }).scrollIntoViewIfNeeded(); await p.screenshot({ path: '.shots/m-ev2.png' })
await b.close()
