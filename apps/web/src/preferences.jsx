import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import en from './locales/en.js'
import th from './locales/th.js'

const DICTIONARIES = { en, th }
const LOCALES = { en: 'en-GB', th: 'th-TH' } // th-TH shows Buddhist-era years
const LANG_KEY = 'cc_lang'
const THEME_KEY = 'cc_theme'

function load(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage blocked: the choice just won't survive a reload
  }
}

function initialLang() {
  const saved = load(LANG_KEY)
  if (saved in DICTIONARIES) return saved
  return navigator.language?.toLowerCase().startsWith('th') ? 'th' : 'en'
}

function initialTheme() {
  const saved = load(THEME_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function lookup(dict, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict)
}

const PreferencesContext = createContext(null)

export function PreferencesProvider({ children }) {
  const [lang, setLangState] = useState(initialLang)
  const [theme, setThemeState] = useState(initialTheme)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  useEffect(() => {
    // index.html sets the class before React loads, so there is no light flash
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const setLang = useCallback((value) => {
    setLangState(value)
    save(LANG_KEY, value)
  }, [])

  const setTheme = useCallback((value) => {
    setThemeState(value)
    save(THEME_KEY, value)
  }, [])

  const value = useMemo(() => {
    /** Translate `key` (e.g. "nav.carbon"), filling {placeholders} from `vars`. */
    function t(key, vars, fallback) {
      const text = lookup(DICTIONARIES[lang], key) ?? lookup(en, key) ?? fallback ?? key
      if (typeof text !== 'string' || !vars) return text
      return text.replace(/\{(\w+)\}/g, (match, name) => (vars[name] ?? match))
    }

    const locale = LOCALES[lang]
    const num = (v, digits = 2) =>
      v === null || v === undefined
        ? '-'
        : Number(v).toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })

    const fmt = {
      num,
      baht: (v) => t('common.baht', { n: num(v, 0) }),
      date: (v) =>
        v ? new Date(v).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: '2-digit' }) : '-',
      dateTime: (v) =>
        v
          ? new Date(v).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
          : '-',
      shortDate: (v) => new Date(v).toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
      /** "Dry season 2027" (or the Thai label with the Buddhist year) from a calendar's season + season_year. */
      season: (c) => t(`season.${c.season}`, { year: lang === 'th' ? c.season_year + 543 : c.season_year }),
      stage: (stageNo) => t(`stage.${stageNo}`),
    }

    return { lang, setLang, theme, setTheme, t, fmt }
  }, [lang, theme, setLang, setTheme])

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export const usePreferences = () => useContext(PreferencesContext)
