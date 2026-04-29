import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const ROOT_ROUTES = ['/']

export function useAndroidBack() {
  const navigate = useNavigate()
  const location = useLocation()
  const lastBackPress = useRef(null)
  const toastRef = useRef(null)

  const isRoot = ROOT_ROUTES.includes(location.pathname)

  useEffect(() => {
    // Push a sentinel state so the first "back" doesn't exit the app
    window.history.pushState({ sentinel: true }, '')

    const handlePopState = (e) => {
      if (isRoot) {
        const now = Date.now()
        if (lastBackPress.current && now - lastBackPress.current < 2000) {
          // Second press within 2s → allow exit by not pushing state again
          return
        }

        // First press → push sentinel back and show toast
        lastBackPress.current = now
        window.history.pushState({ sentinel: true }, '')
        showExitToast()
      } else {
        // Not on root → navigate back normally
        navigate(-1)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isRoot, navigate])

  function showExitToast() {
    // Remove existing toast if any
    if (toastRef.current) {
      toastRef.current.remove()
    }

    const toast = document.createElement('div')
    toast.innerText = 'Pressione voltar novamente para sair'
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '90px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(30,30,30,0.97)',
      color: '#F0F0F0',
      padding: '12px 20px',
      borderRadius: '10px',
      fontSize: '14px',
      fontFamily: "'DM Sans', sans-serif",
      border: '1px solid rgba(255,255,255,0.1)',
      zIndex: '9999',
      whiteSpace: 'nowrap',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      opacity: '0',
      transition: 'opacity 200ms ease',
      pointerEvents: 'none',
    })

    document.body.appendChild(toast)
    toastRef.current = toast

    // Fade in
    requestAnimationFrame(() => { toast.style.opacity = '1' })

    // Fade out and remove after 2s
    setTimeout(() => {
      toast.style.opacity = '0'
      setTimeout(() => toast.remove(), 200)
    }, 2000)
  }
}
