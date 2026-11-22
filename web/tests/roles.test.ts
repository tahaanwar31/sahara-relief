import { describe, it, expect } from 'vitest'
import { NAV, roleMayOpen, homeFor } from '../src/auth/roles'
import { matchRoute } from '../src/router'
import type { Role } from '../src/api/types'

describe('role-aware navigation', () => {
  it('each role only sees links it may open', () => {
    for (const [role, items] of Object.entries(NAV)) {
      for (const it of items) expect(roleMayOpen(role as Role, it.to), `${role} may open ${it.to}`).toBe(true)
    }
  })
  it('citizens never get staff screens; helpers never get the queue', () => {
    expect(roleMayOpen('citizen', '/queue')).toBe(false)
    expect(roleMayOpen('citizen', '/rules')).toBe(false)
    expect(roleMayOpen('helper', '/queue')).toBe(false)
    expect(roleMayOpen('citizen', '/policy')).toBe(false)
    expect(roleMayOpen('admin', '/audit')).toBe(true)
    expect(roleMayOpen('admin', '/policy')).toBe(true)
    expect(homeFor('admin')).toBe('/queue')
  })
  it('matches routes with params', () => {
    expect(matchRoute('/claim/:id/:step', '/claim/abc/3')).toEqual({ id: 'abc', step: '3' })
    expect(matchRoute('/claim', '/claim/abc')).toBeNull()
  })
})
