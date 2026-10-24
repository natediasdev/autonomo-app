import { useState, useEffect } from 'react'

const THEME_KEY = 'autonomo:theme'

// Returns the current resolved theme ('dark' | 'light') and a toggle function.
// Priority: localStorage override → system preference → 'dark'
export function useTheme() {
  const getSystemTheme = () =>
    window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'

  const getStored = () => localStorage.getItem(THEME_KEY) // 'light' | 'dark' | null

  const [theme, setTheme] = useState(() => getStored() || null) // null = follow system

  // Apply to <html> data-theme
  useEffect(() => {
    const html = document.documentElement
    if (theme) {
      html.setAttribute('data-theme', theme)
    } else {
      html.removeAttribute('data-theme') // let CSS media query take over
    }
  }, [theme])

  // Listen for system preference changes (only relevant when theme = null)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const handler = () => {
      if (!getStored()) setTheme(null) // force re-render to pick up new system pref
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggle = () => {
    const resolved = theme || getSystemTheme()
    const next = resolved === 'dark' ? 'light' : 'dark'
    localStorage.setItem(THEME_KEY, next)
    setTheme(next)
  }

  const resolved = theme || getSystemTheme()

  return { theme: resolved, toggle, isOverridden: !!theme, reset: () => {
    localStorage.removeItem(THEME_KEY)
    setTheme(null)
  }}
}
