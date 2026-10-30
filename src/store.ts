import { useSyncExternalStore } from 'react'
import type { ExamRecord } from './types'
import { emptyProgress, normalize, type Progress } from './sync/merge'

/** Everything the app remembers on this device. `textSize` stays per device; the rest syncs (see sync/). */
export type State = Progress & { textSize: 0 | 1 | 2 }

export const MISTAKE_STREAK_TO_CLEAR = 2
const KEY = 'zdam.v2'
const OLD_KEY = 'zdam.v1'

/** Progress saved before syncing existed: counts and streaks without times. */
function migrate(old: Record<string, any>): State {
  const now = Date.now()
  const p = emptyProgress()
  for (const [id, a] of Object.entries<any>(old.answers ?? {})) p.answers[id] = { ok: !!a.last, t: 0 }
  for (const [id, s] of Object.entries<any>(old.mistakes ?? {})) p.mistakes[id] = { s: Number(s) || 0, t: now }
  for (const [sec, i] of Object.entries<any>(old.learnPos ?? {})) p.learnPos[sec] = { i: Number(i) || 0, t: 0 }
  p.exams = Array.isArray(old.exams) ? old.exams : []
  return { ...p, textSize: old.textSize ?? 1 }
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      return { ...normalize(saved), textSize: saved.textSize ?? 1 }
    }
    const old = localStorage.getItem(OLD_KEY)
    if (old) return migrate(JSON.parse(old))
  } catch {
    // Unreadable storage: start fresh rather than fail.
  }
  return { ...emptyProgress(), textSize: 1 }
}

let state = load()
const listeners = new Set<() => void>()
const changeListeners = new Set<() => void>()

function set(next: State, { local = true } = {}) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Storage full or blocked: keep working in memory for this visit.
  }
  listeners.forEach((l) => l())
  if (local) changeListeners.forEach((l) => l())
}

export function useStore(): State {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => state,
  )
}

export function getState() {
  return state
}

/** Called after every change made on this device (not after a merge from another one). */
export function onLocalChange(l: () => void) {
  changeListeners.add(l)
  return () => changeListeners.delete(l)
}

export function getProgress(): Progress {
  const { textSize: _ignored, ...p } = state
  return p
}

/** Put merged progress in place without counting it as a new local change. */
export function replaceProgress(p: Progress) {
  set({ ...p, textSize: state.textSize }, { local: false })
}

// ---------- reading ----------

export const isLearned = (s: State, id: string) => s.answers[id]?.ok === true

/** Question ids in the mistakes pile right now. */
export const pileIds = (s: State) => Object.keys(s.mistakes).filter((id) => !s.mistakes[id].gone)

export const learnPosOf = (s: State, section: string) => s.learnPos[section]?.i ?? 0

// ---------- changing ----------

/** Record an answer anywhere in the app; keeps the mistakes pile in step. */
export function recordAnswer(id: string, right: boolean) {
  const t = Date.now()
  const answers = { ...state.answers, [id]: { ok: right, t } }
  const mistakes = { ...state.mistakes }
  const m = mistakes[id]
  if (!right) mistakes[id] = { s: 0, t }
  else if (m && !m.gone) {
    const s = m.s + 1
    mistakes[id] = s >= MISTAKE_STREAK_TO_CLEAR ? { s, t, gone: true } : { s, t }
  }
  set({ ...state, answers, mistakes })
}

export function saveExam(rec: ExamRecord) {
  set({ ...state, exams: [rec, ...state.exams].slice(0, 100) })
}

export function setLearnPos(section: string, i: number) {
  set({ ...state, learnPos: { ...state.learnPos, [section]: { i, t: Date.now() } } })
}

export function setTextSize(textSize: State['textSize']) {
  // Per device: a phone and a tablet want different sizes, so this is not a synced change.
  set({ ...state, textSize }, { local: false })
}
