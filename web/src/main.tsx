import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { LangProvider } from './i18n'
import { AuthProvider } from './auth/AuthContext'
import { startOutboxRunner } from './offline/runtime'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true }) // installable + works offline (the app shell is cached)
startOutboxRunner()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </LangProvider>
  </StrictMode>,
)
