/**
 * Safari (especially private browsing / strict ITP) can throw when touching
 * localStorage or sessionStorage. Never let storage access crash the app boot.
 */

export function safeGetItem(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

export function safeSetItem(storage: Storage, key: string, value: string): boolean {
  try {
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeRemoveItem(storage: Storage, key: string): void {
  try {
    storage.removeItem(key)
  } catch {
    // ignore
  }
}

export function safeLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    const probe = '__fleet_storage_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
}

export function safeSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    const probe = '__fleet_storage_probe__'
    window.sessionStorage.setItem(probe, '1')
    window.sessionStorage.removeItem(probe)
    return window.sessionStorage
  } catch {
    return null
  }
}
