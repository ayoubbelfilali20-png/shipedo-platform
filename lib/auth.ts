/**
 * Per-role auth storage. Each role has its own localStorage key so opening
 * admin / seller / agent in different browser tabs (or browsers) does not
 * cross-contaminate sessions.
 */

export type Role = 'admin' | 'seller' | 'agent'

export type StoredUser = {
  role: Role
  id?: string
  email?: string
  name?: string
  fullName?: string
  [k: string]: any
}

const KEYS: Record<Role, string> = {
  admin:  'shipedo_admin',
  seller: 'shipedo_seller',
  agent:  'shipedo_agent',
}

function read(role: Role): StoredUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEYS[role])
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && parsed.role === role) return parsed
    return null
  } catch {
    return null
  }
}

export function getAdmin():  StoredUser | null { return read('admin')  }
export function getSeller(): StoredUser | null { return read('seller') }
export function getAgent():  StoredUser | null { return read('agent')  }

export function setUser(user: StoredUser) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEYS[user.role], JSON.stringify(user))
}

export function clearUser(role: Role) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEYS[role])
}

/** Legacy fallback: read whichever single user key exists. */
export function getCurrentUser(): StoredUser | null {
  return getAdmin() || getSeller() || getAgent()
}
