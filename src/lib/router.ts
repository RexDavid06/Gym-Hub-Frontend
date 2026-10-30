import { useCallback, useEffect, useState } from 'react'

function readRoute() {
  const hash = window.location.hash.replace(/^#/, '')
  return hash === '' ? '/' : hash
}

export function navigate(path: string) {
  if (readRoute() === path) return
  window.location.hash = path
}

export function useRoute() {
  const [route, setRoute] = useState(readRoute)

  useEffect(() => {
    const onChange = () => setRoute(readRoute())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}

export function useNavigate() {
  return useCallback((path: string) => navigate(path), [])
}
