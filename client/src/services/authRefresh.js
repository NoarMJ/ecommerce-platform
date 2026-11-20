let refreshPromise = null

// Resolves to true if a new access cookie was issued, false otherwise.
export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}
