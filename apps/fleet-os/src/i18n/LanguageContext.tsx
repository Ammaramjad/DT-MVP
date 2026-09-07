import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { safeGetItem, safeLocalStorage, safeSetItem } from '../lib/safeStorage'
import { translate, type Lang } from './translations'

const STORAGE_KEY = 'fleet-dispatch-lang'

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  toggleLang: () => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function readStoredLang(): Lang {
  if (typeof window === 'undefined') return 'en'
  try {
    const storage = safeLocalStorage()
    if (!storage) return 'en'
    const stored = safeGetItem(storage, STORAGE_KEY)
    return stored === 'zh' || stored === 'en' ? stored : 'en'
  } catch {
    return 'en'
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang)

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en'
  }, [lang])

  const setLang = (next: Lang) => {
    setLangState(next)
    const storage = safeLocalStorage()
    if (storage) {
      safeSetItem(storage, STORAGE_KEY, next)
    }
  }

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang,
      toggleLang: () => setLang(lang === 'en' ? 'zh' : 'en'),
      t: (key, vars) => translate(lang, key, vars),
    }),
    [lang],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang() must be used within a <LanguageProvider>')
  return ctx
}
