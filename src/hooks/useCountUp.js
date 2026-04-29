import { useEffect, useRef, useState } from 'react'

export function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0)
  const rafRef   = useRef(null)
  const startRef = useRef(null)
  const fromRef  = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    const diff = target - from
    if (Math.abs(diff) < 0.005) { setValue(target); return }

    const animate = (now) => {
      if (!startRef.current) startRef.current = now
      const progress = Math.min((now - startRef.current) / duration, 1)
      const eased    = 1 - Math.pow(1 - progress, 3)
      setValue(from + diff * eased)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        fromRef.current = target
        startRef.current = null
      }
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    startRef.current = null
    rafRef.current   = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return value
}

export function formatCurrencyBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}
