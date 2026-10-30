import { useSyncExternalStore } from 'react'

/** Tiny hash router so the phone's back button and reloads keep the current screen. */
export function useRoute(): string[] {
  const hash = useSyncExternalStore(
    (l) => (window.addEventListener('hashchange', l), () => window.removeEventListener('hashchange', l)),
    () => window.location.hash,
  )
  return hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
}

export function go(...parts: (string | number)[]) {
  window.location.hash = '/' + parts.map((p) => encodeURIComponent(String(p))).join('/')
  window.scrollTo(0, 0)
}
