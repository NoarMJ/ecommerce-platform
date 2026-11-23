import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// BrowserRouter keeps the old scroll position on navigation.
// Reset to the top on every route change, except for in-page #anchor links.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname, hash])

  return null
}
