import { Expedition, ExpeditionStatus } from './types'

const KEY = 'shipedo_expeditions'

export function loadStoredExpeditions(): Expedition[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Expedition[]) : []
  } catch {
    return []
  }
}

export function saveStoredExpeditions(list: Expedition[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function addStoredExpedition(exp: Expedition) {
  const list = loadStoredExpeditions()
  list.unshift(exp)
  saveStoredExpeditions(list)
}

export function updateStoredExpeditionStatus(id: string, status: ExpeditionStatus) {
  const list = loadStoredExpeditions().map(e =>
    e.id === id ? { ...e, status, updatedAt: new Date().toISOString() } : e
  )
  saveStoredExpeditions(list)
}
