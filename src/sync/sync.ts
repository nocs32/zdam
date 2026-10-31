import { useSyncExternalStore } from 'react'
import { getProgress, onLocalChange, replaceProgress } from '../store'
import { canonical, merge, normalize, type Progress } from './merge'

/**
 * Background sync with the server on the Pi. The app always works from this device's own copy;
 * syncing fetches the shared copy, merges it with ours, and saves the result back.
 *
 * The device knows the sync key from a one-time link: https://…/#k=<key>
 */

export type SyncStatus =
  | { kind: 'off' } // no key on this device: progress stays here only
  | { kind: 'syncing' }
  | { kind: 'synced'; at: number }
  | { kind: 'offline' } // will sync when the connection is back
  | { kind: 'badkey' }

const KEY_STORE = 'zdam.key'
const LAST_SYNC = 'zdam.lastSync'
const API = 'api/progress'

let status: SyncStatus = { kind: 'off' }
const listeners = new Set<() => void>()
function setStatus(s: SyncStatus) {
  status = s
  listeners.forEach((l) => l())
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => status,
  )
}

export function getKey(): string | null {
  try {
    return localStorage.getItem(KEY_STORE)
  } catch {
    return null
  }
}

/** The link that connects another device: open it there once. */
export function deviceLink(): string | null {
  const key = getKey()
  if (!key) return null
  return `${location.origin}${location.pathname}#k=${encodeURIComponent(key)}`
}

function saveKey(key: string) {
  try {
    localStorage.setItem(KEY_STORE, key)
  } catch {
    // Without storage the key can't be kept; the app still works on this device alone.
  }
}

/** Take the key from a #k=… link (and remove it from the address bar), then go home. */
function takeKeyFromUrl() {
  const m = location.hash.match(/^#k=([^&/]+)/)
  if (!m) return
  saveKey(decodeURIComponent(m[1]))
  history.replaceState(null, '', `${location.pathname}#/`)
  // replaceState doesn't announce itself; tell the router the screen changed.
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

/** The key in a pasted device link, or a pasted bare key. */
function keyFrom(text: string): string | null {
  const t = text.trim()
  const m = t.match(/#k=([^&/\s]+)/)
  if (m) {
    try {
      return decodeURIComponent(m[1])
    } catch {
      return null
    }
  }
  return /^[A-Za-z0-9_-]{16,}$/.test(t) ? t : null
}

/**
 * Connect this device with a pasted device link. For apps added to an iPhone's home screen:
 * they keep their own storage apart from Safari and have no address bar to open the link in.
 */
export function connectWith(text: string): boolean {
  const key = keyFrom(text)
  if (!key) return false
  saveKey(key)
  void syncNow()
  return true
}

async function request(method: 'GET' | 'PUT', key: string, body?: unknown, version?: number) {
  const headers: Record<string, string> = { 'X-Zdam-Key': key }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (version !== undefined) headers['If-Match'] = String(version)
  const res = await fetch(API, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' })
  return { status: res.status, data: res.headers.get('content-type')?.includes('json') ? await res.json() : null }
}

let running: Promise<void> | null = null
let again = false

/** Sync now; if a sync is already running, run once more after it. */
export function syncNow(): Promise<void> {
  if (running) {
    again = true
    return running
  }
  running = (async () => {
    do {
      again = false
      await syncOnce()
    } while (again)
  })().finally(() => (running = null))
  return running
}

async function syncOnce() {
  const key = getKey()
  if (!key) return setStatus({ kind: 'off' })
  if (!navigator.onLine) return setStatus({ kind: 'offline' })
  setStatus({ kind: 'syncing' })
  try {
    let remote = await request('GET', key)
    for (let attempt = 0; attempt < 4; attempt++) {
      if (remote.status === 401) return setStatus({ kind: 'badkey' })
      if (remote.status !== 200 && remote.status !== 409) throw new Error(`HTTP ${remote.status}`)
      const { version, state } = remote.data as { version: number; state: unknown }
      const theirs: Progress | null = state ? normalize(state) : null
      const merged = theirs ? merge(getProgress(), theirs) : getProgress()
      replaceProgress(merged)
      if (theirs && canonical(merged) === canonical(theirs)) return done()
      const saved = await request('PUT', key, { state: merged }, version)
      if (saved.status === 200) return done()
      if (saved.status === 401) return setStatus({ kind: 'badkey' })
      if (saved.status !== 409) throw new Error(`HTTP ${saved.status}`)
      remote = saved // another device saved first: merge with theirs and try again
    }
    throw new Error('too many conflicts')
  } catch {
    setStatus({ kind: 'offline' })
  }
}

function done() {
  const at = Date.now()
  try {
    localStorage.setItem(LAST_SYNC, String(at))
  } catch {
    // Only used for the status line.
  }
  setStatus({ kind: 'synced', at })
}

let timer: ReturnType<typeof setTimeout> | undefined

/** Start syncing: now, a few seconds after each change, when the app comes back on screen or online, and every minute while open. */
export function startSync() {
  takeKeyFromUrl()
  window.addEventListener('hashchange', () => {
    if (/^#k=/.test(location.hash)) {
      takeKeyFromUrl()
      void syncNow()
    }
  })
  onLocalChange(() => {
    clearTimeout(timer)
    timer = setTimeout(() => void syncNow(), 3000)
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncNow()
    else if (timer) {
      // Leaving the app: save what's pending straight away.
      clearTimeout(timer)
      void syncNow()
    }
  })
  window.addEventListener('online', () => void syncNow())
  setInterval(() => {
    if (document.visibilityState === 'visible') void syncNow()
  }, 60_000)
  void syncNow()
}

export function forgetKey() {
  try {
    localStorage.removeItem(KEY_STORE)
  } catch {
    // Nothing to forget.
  }
  setStatus({ kind: 'off' })
}
