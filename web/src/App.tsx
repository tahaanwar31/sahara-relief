// The route table. Pages load on demand, so a citizen never downloads officer or admin code.
import { Component, lazy, Suspense, useEffect, type ComponentType, type ReactNode } from 'react'
import { Layout } from './components/Layout'
import { Spinner, Btn, SyntheticBanner } from './components/ui'
import { Icon } from './components/Icon'
import { useAuth } from './auth/AuthContext'
import { ROUTE_ROLES, homeFor } from './auth/roles'
import { matchRoute, navigate, usePath } from './router'
import { useLang } from './i18n'
import Login from './pages/Login'

type Page = ComponentType<{ params: Record<string, string> }>
const claim = lazy(() => import('./pages/citizen/Claim'))
const resume = lazy(() => import('./pages/citizen/Resume'))
const scam = lazy(() => import('./pages/citizen/Scam'))
const consents = lazy(() => import('./pages/citizen/Consents'))
const families = lazy(() => import('./pages/helper/Families'))
const queue = lazy(() => import('./pages/officer/Queue'))
const caseView = lazy(() => import('./pages/officer/CaseView'))
const rules = lazy(() => import('./pages/admin/Rules'))
const ruleEdit = lazy(() => import('./pages/admin/RuleEditor'))
const policy = lazy(() => import('./pages/admin/Policy'))
const twin = lazy(() => import('./pages/admin/Twin'))
const evalPage = lazy(() => import('./pages/admin/Evaluation'))
const audit = lazy(() => import('./pages/auditor/Audit'))

const PAGES: Record<string, Page> = {
  '/claim': claim as Page,
  '/claim/:id/:step': claim as Page,
  '/helper': families as Page,
  '/helper/claim/:id/:step': claim as Page,
  '/scam': scam as Page,
  '/consents': consents as Page,
  '/queue': queue as Page,
  '/queue/:id': caseView as Page,
  '/rules': rules as Page,
  '/rules/:id': ruleEdit as Page,
  '/policy': policy as Page,
  '/twin': twin as Page,
  '/eval': evalPage as Page,
  '/audit': audit as Page,
}
// pages that need no login
const PUBLIC: Record<string, Page> = { '/resume': resume as Page }

function Plain({ icon, title, text, action }: { icon: 'lock' | 'warning' | 'search'; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card text-center py-12">
      <Icon name={icon} size={52} className="mx-auto text-muted" />
      <h2 className="mt-4">{title}</h2>
      <p className="mt-2 text-muted">{text}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  )
}

function Home() {
  const { user } = useAuth()
  useEffect(() => { navigate(user ? homeFor(user.role) : '/login', true) }, [user])
  return <Spinner />
}

export function Forbidden() {
  const { t } = useLang()
  const { user } = useAuth()
  return <Plain icon="lock" title={t('err.forbidden.title')} text={t('err.forbidden.text')} action={<Btn onClick={() => navigate(user ? homeFor(user.role) : '/login')}>{t('common.home')}</Btn>} />
}
function NotFound() {
  const { t } = useLang()
  return <Plain icon="search" title={t('err.notfound.title')} text={t('err.notfound.text')} action={<Btn onClick={() => navigate('/')}>{t('common.home')}</Btn>} />
}

class Boundary extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false }
  static getDerivedStateFromError() { return { err: true } }
  render() {
    if (!this.state.err) return this.props.children
    return <Plain icon="warning" title="Something went wrong" text="Please reload the page. Your saved work is safe on this phone." action={<Btn onClick={() => location.reload()}>Reload</Btn>} />
  }
}

export default function App() {
  const path = usePath()
  const { user, expired } = useAuth()
  const { t } = useLang()

  if (path === '/login') return <Login expired={expired} />

  // public pages
  for (const [pattern, Page] of Object.entries(PUBLIC)) {
    const params = matchRoute(pattern, path)
    if (params) return <Layout><Boundary><Suspense fallback={<Spinner />}><Page params={params} /></Suspense></Boundary></Layout>
  }

  if (path === '/' || path === '') return <Layout><Home /></Layout>

  if (!user) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto max-w-md p-6">
          <Plain icon="lock" title={t('err.login.title')} text={t('err.login.text')} action={<Btn onClick={() => navigate('/login')}>{t('login.button')}</Btn>} />
        </div>
      </div>
    )
  }

  for (const def of ROUTE_ROLES) {
    const params = matchRoute(def.pattern, path)
    const Page = PAGES[def.pattern]
    if (!params || !Page) continue
    const allowed = def.roles === 'any' || def.roles.includes(user.role)
    return (
      <Layout>
        <Boundary>
          {allowed ? <Suspense fallback={<Spinner />}><Page params={params} /></Suspense> : <Forbidden />}
        </Boundary>
      </Layout>
    )
  }
  return <Layout><NotFound /></Layout>
}
