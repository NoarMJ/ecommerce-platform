export function getLoginDestination(user, requestedPath) {
  return requestedPath || (user?.role === 'admin' ? '/admin' : '/')
}
