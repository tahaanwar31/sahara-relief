// Who may see which screen. The service enforces the real rules; the screens only hide what you cannot use.
import type { Role } from '../api/types'
import type { IconName } from '../components/Icon'

export interface RouteDef { pattern: string; roles: Role[] | 'any' }

/** One table for the router and the navigation. */
export const ROUTE_ROLES: RouteDef[] = [
  { pattern: '/claim', roles: ['citizen'] },
  { pattern: '/claim/:id/:step', roles: ['citizen'] },
  { pattern: '/helper', roles: ['helper'] },
  { pattern: '/helper/claim/:id/:step', roles: ['helper'] },
  { pattern: '/scam', roles: ['citizen', 'helper'] },
  { pattern: '/consents', roles: ['citizen', 'helper'] },
  { pattern: '/queue', roles: ['admin'] },
  { pattern: '/queue/:id', roles: ['admin'] },
  { pattern: '/rules', roles: ['admin'] },
  { pattern: '/rules/:id', roles: ['admin'] },
  { pattern: '/policy', roles: ['admin'] },
  { pattern: '/twin', roles: ['admin'] },
  { pattern: '/eval', roles: ['admin'] },
  { pattern: '/audit', roles: ['admin'] },
]

export interface NavItem { to: string; label: string; icon: IconName }

/** Navigation per role. `label` is an i18n key. */
export const NAV: Record<Role, NavItem[]> = {
  citizen: [
    { to: '/claim', label: 'nav.claim', icon: 'home' },
    { to: '/scam', label: 'nav.scam', icon: 'shield' },
    { to: '/consents', label: 'nav.mydata', icon: 'lock' },
  ],
  helper: [
    { to: '/helper', label: 'nav.families', icon: 'people' },
    { to: '/scam', label: 'nav.scam', icon: 'shield' },
    { to: '/consents', label: 'nav.mydata', icon: 'lock' },
  ],
  admin: [
    { to: '/queue', label: 'nav.queue', icon: 'list' },
    { to: '/rules', label: 'nav.rules', icon: 'edit' },
    { to: '/policy', label: 'nav.policy', icon: 'sliders' },
    { to: '/twin', label: 'nav.twin', icon: 'copy' },
    { to: '/eval', label: 'nav.eval', icon: 'chart' },
    { to: '/audit', label: 'nav.audit', icon: 'doc' },
  ],
}

export function homeFor(role: Role): string { return NAV[role][0].to }

export function roleMayOpen(role: Role | undefined, pattern: string): boolean {
  const def = ROUTE_ROLES.find((r) => r.pattern === pattern)
  if (!def) return false
  return def.roles === 'any' || (!!role && def.roles.includes(role))
}
export const isStaff = (role?: Role) => role === 'admin'
