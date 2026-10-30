import type { ExamRecord } from '../types'

/**
 * Progress that is shared between devices. Every entry carries the time it last changed (`t`, ms),
 * so two copies edited apart (a phone used offline, a tablet at home) merge entry by entry:
 * the newer change wins, and nothing done on one device is lost because the other saved later.
 */
export type Progress = {
  /** Per question: was the latest answer right. */
  answers: Record<string, { ok: boolean; t: number }>
  /** The mistakes pile: right answers in a row since the last mistake. `gone` once cleared, so another device can't bring it back. */
  mistakes: Record<string, { s: number; t: number; gone?: true }>
  exams: ExamRecord[]
  /** Where learning stopped in each topic. */
  learnPos: Record<string, { i: number; t: number }>
}

export const emptyProgress = (): Progress => ({ answers: {}, mistakes: {}, exams: [], learnPos: {} })

export const MAX_EXAMS = 100

function newer<T extends { t: number }>(a: Record<string, T>, b: Record<string, T>): Record<string, T> {
  const out = { ...a }
  for (const [k, v] of Object.entries(b)) {
    if (!out[k] || v.t > out[k].t) out[k] = v
  }
  return out
}

export function merge(a: Progress, b: Progress): Progress {
  const exams = new Map<number, ExamRecord>()
  for (const e of [...a.exams, ...b.exams]) exams.set(e.at, e)
  return {
    answers: newer(a.answers, b.answers),
    mistakes: newer(a.mistakes, b.mistakes),
    exams: [...exams.values()].sort((x, y) => y.at - x.at).slice(0, MAX_EXAMS),
    learnPos: newer(a.learnPos, b.learnPos),
  }
}

/** Checks the shape of progress that came from storage or the network; anything unknown becomes empty. */
export function normalize(raw: unknown): Progress {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Partial<Progress>
  const obj = <T>(x: unknown) => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, T>) : {})
  return {
    answers: obj(p.answers),
    mistakes: obj(p.mistakes),
    exams: Array.isArray(p.exams) ? p.exams : [],
    learnPos: obj(p.learnPos),
  }
}

/** JSON with sorted keys, so two equal copies compare equal as strings. */
export function canonical(x: unknown): string {
  return JSON.stringify(x, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, (v as Record<string, unknown>)[k]]))
      : v,
  )
}
