export type Section = { id: string; title: string; count: number }

export type Explanation = {
  correct: string
  /** Why each wrong option is wrong, keyed by option number ("1", "2", ...). */
  wrong: Record<string, string>
  rule: string | null
  /** Caveat for disputed questions: outdated rule, unclear picture, or an error in the official bank. */
  note?: string
}

export type Question = {
  id: string
  section: string
  n: number
  text: string
  options: string[]
  /** 1-based number of the correct option. */
  correct: number
  images: string[]
  ex?: Explanation
}

export type Bank = { sections: Section[]; questions: Question[] }

export type ExamItem = { id: string; chosen: number | null }

export type ExamRecord = {
  at: number
  passed: boolean
  reason: 'done' | 'mistakes' | 'time'
  mistakes: number
  answered: number
  seconds: number
  items: ExamItem[]
}
