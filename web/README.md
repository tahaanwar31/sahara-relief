# Sahara Relief web app (prototype, synthetic data)

React + TypeScript + Vite + Tailwind. Installable offline-capable web app (PWA). It talks only to the Python service by REST.
Every screen shows a SYNTHETIC / PROTOTYPE banner.

## Run it

```
cd web
npm install
npm run dev:mock      # in-browser stubs, no service needed (default when nothing is set)
npm run dev:live      # talks to the service at VITE_API_BASE (default http://localhost:8000)
```

Switching is one env variable: `VITE_API_MODE=mock|live` and `VITE_API_BASE=http://host:port` (see `.env.example`, `.env.mock`, `.env.live`).
In live mode the service must allow this origin in `CORS_ORIGINS` (for the dev server: `http://localhost:5173`).
Test users appear as quick buttons on the login page only in mock mode or `npm run dev`. The passwords are in CONTRACT.md.

Other commands:

```
npm test                         # Vitest (27 tests)
npm run build                    # type check + production build (mock by default)
npm run build:mock && npm run smoke   # end-to-end smoke test in the installed Google Chrome
npm run build:live               # production build with no mock code in it
npm run audio:manifest           # JSON list of every prompt key and text (for the audio generator)
npm run sync:reasons             # copy ../shared/reasons.json into src/data/
```

The smoke test uses `C:\Program Files\Google\Chrome\Application\chrome.exe` (override with CHROME_PATH). It logs in as the citizen, goes through
the claim steps, loses signal on the way, gets it back and sees the result card, then logs in as an officer and sees the queue.
Screenshots go to `.smoke/`.

## Folder map

```
src/api/        types.ts (hand-written from CONTRACT.md), client.ts (one request(), errors, idempotency keys),
                index.ts (one typed function per endpoint), mock.ts (the in-browser service)
src/auth/       login state, helper's active family, role table (who may open what) and navigation
src/offline/    outbox.ts (IndexedDB queue), runtime.ts (try now or queue, local draft copy, hooks), net.ts (signal state)
src/audio/      playPrompt.ts  (file, else browser voice, else show the text)
src/i18n/       en.json, ur.json, the t() function, page direction (Urdu = right to left)
src/rules/      the json-logic subset: validation, friendly form model
src/pages/      Login, citizen/ (Claim, Resume, Scam, Consents), helper/, officer/, admin/
src/components/ shared pieces (buttons, number pad, speaker button, layout, trace list ...)
scripts/        audio_manifest.mjs, smoke.mjs, make_icons.mjs, sync_reasons.mjs
tests/          Vitest tests
```

## Screens

Citizen: login (PIN pad), 8-step claim with progress dots, speaker on every step and a resume code, resume screen, "Is this message real?",
"My data" (permissions, take back, who saw my data). Helper: family list, session banner with End session, per-family consent, the same claim flow
(a helper has no approve button anywhere), 60 second idle cover. Officer: queue (polls every 10 s), case page with checks, papers, notes, trace, four actions,
second-approver notice. Admin: rule versions, friendly rule editor with validation, policy sliders with an SVG cost chart, Digital Twin, activate with confirmation,
evaluation page, and the diary. Admin diary with filters, Verify button, trace viewer.
Navigation shows only what the role may use. The service must still refuse the rest.

## Offline and weak network

- The service worker caches the app shell. Audio files are cached the first time they are played.
- Progress is saved to the phone (IndexedDB) and to the service (`PUT /cases/{id}/draft` with an `Idempotency-Key`).
- Writes made with no signal (draft saves, photos, the final send) wait in the outbox and are sent in order when signal returns.
  Each has its own key, so a retry after a lost reply makes no duplicate. The top bar shows "No signal" and "N waiting to send".
- Photos are shrunk in the browser (max 1280 px, JPEG 0.7) before upload.
- Lists poll every 10 seconds. No websockets.

## Audio

Expected files: `public/audio/ur/<KEY>.mp3` and `public/audio/en/<KEY>.mp3`. Keys: reason codes (e.g. `R_AUTO_APPROVED`), `step_1` ... `step_8`,
`step_8_waiting`, `login`, `resume`, `scam`, `consents`, `helper`, `doc_<type>`, `scam_<CODE>`, `scam_safe|suspicious|scam`.
`npm run audio:manifest` prints every key with its text for the generator. `playPrompt(key, lang, text)` plays the file if it exists, else uses
a browser voice for that language if one is installed, else the speaker button shows the text in big letters. It never throws.
There are no audio files in the repo yet.

## Honest limits

- Mock mode is a stand-in. Its decisions, queue, rule sets, twin and numbers are made up and follow the contract shapes only.
- Starting a NEW claim and checking the payout account need signal. After the first step the claim can continue offline.
- The Urdu text is a draft and needs a native-speaker check. Staff screens (officer, admin) are English only.
- Voice input is not built; big Yes/No buttons are the input.
- Service worker behaviour was checked in Chrome only. The installed-app icons are simple generated PNGs.
- Some response shapes are not in CONTRACT.md and are assumed; see `ISSUES.md`.
