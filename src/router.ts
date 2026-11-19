import { useSyncExternalStore } from 'react'

export type Route = { name: 'home' } | { name: 'room'; id: string }

const HOME: Route = { name: 'home' }

/** `#/` → home, `#/room/:id` → room, anything else → home. */
export function parseHash(hash: string): Route {
  const match = /^#\/room\/([^/]+)\/?$/.exec(hash)
  return match ? { name: 'room', id: match[1] } : HOME
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

const getHash = () => window.location.hash

export function useHashRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash)
  return parseHash(hash)
}

export function navigate(hash: string): void {
  window.location.hash = hash
}
