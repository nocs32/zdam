import { useEffect, useState } from 'react'
import type { Bank, Question } from './types'

let cache: Bank | null = null
let pending: Promise<Bank> | null = null

export function loadBank(): Promise<Bank> {
  if (cache) return Promise.resolve(cache)
  pending ??= fetch('data/bank.json')
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json() as Promise<Bank>
    })
    .then((b) => (cache = b))
  return pending
}

export function useBank(): { bank: Bank | null; error: string | null } {
  const [bank, setBank] = useState(cache)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!bank) loadBank().then(setBank, (e) => setError(String(e)))
  }, [bank])
  return { bank, error }
}

export function byId(bank: Bank): Map<string, Question> {
  return new Map(bank.questions.map((q) => [q.id, q]))
}

export function shuffle<T>(xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Ukrainian plural: plural(5, 'питання', 'питання', 'питань'). */
export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}
