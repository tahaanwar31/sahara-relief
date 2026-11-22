// Copies the shared reason codes into the web app (the web folder keeps its own copy so it builds alone).
import { copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
copyFileSync(join(here, '..', '..', 'shared', 'reasons.json'), join(here, '..', 'src', 'data', 'reasons.json'))
console.log('reasons.json copied from shared/')
