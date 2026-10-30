import { useDeferredValue, useMemo, useState } from 'react'
import type { Bank, Question } from '../types'
import { go } from '../router'
import { plural } from '../data'
import { TopBar } from '../components/TopBar'
import { QuestionView } from '../components/QuestionView'

const PAGE = 20

function norm(s: string) {
  return s.toLowerCase().replace(/[’'ʼ`]/g, '').replace(/ё/g, 'е')
}

export function Browse({ bank }: { bank: Bank }) {
  const [query, setQuery] = useState('')
  const [section, setSection] = useState('')
  const [shown, setShown] = useState(PAGE)
  const q = useDeferredValue(query)

  const index = useMemo(
    () => bank.questions.map((x) => [x, norm([x.text, ...x.options, x.ex?.correct ?? ''].join(' '))] as const),
    [bank],
  )
  const results: Question[] = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean)
    // "12-17" or "12.17" style search jumps straight to one question by its number.
    const idMatch = q.trim().match(/^(\d{1,2}(?:\.\d)?)[\s\-/](\d{1,3})$/)
    return index
      .filter(([x, text]) => {
        if (section && x.section !== section) return false
        if (idMatch) return x.section === idMatch[1] && x.n === Number(idMatch[2])
        return words.every((w) => text.includes(w))
      })
      .map(([x]) => x)
  }, [index, q, section])

  return (
    <main className="page">
      <TopBar title="Усі питання" onBack={() => go()} />
      <div className="filters">
        <label className="field">
          <span className="field-label">Пошук за словами</span>
          <input
            className="input"
            type="search"
            value={query}
            placeholder="Наприклад: обгін, пішохідний перехід"
            onChange={(e) => {
              setQuery(e.target.value)
              setShown(PAGE)
            }}
          />
        </label>
        <label className="field">
          <span className="field-label">Тема</span>
          <select
            className="input"
            value={section}
            onChange={(e) => {
              setSection(e.target.value)
              setShown(PAGE)
            }}
          >
            <option value="">Усі теми</option>
            {bank.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}. {s.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="counter" aria-live="polite">
        Знайдено {results.length} {plural(results.length, 'питання', 'питання', 'питань')}
      </p>
      {results.length === 0 && <p className="lead">Нічого не знайдено. Спробуйте коротше слово або оберіть «Усі теми».</p>}
      {results.slice(0, shown).map((x) => (
        <div key={x.id} className="review-item">
          <p className="review-head">
            Тема {x.section}, питання {x.n}
          </p>
          <QuestionView q={x} chosen={null} reveal explain />
        </div>
      ))}
      {shown < results.length && (
        <button className="btn-plate wide" onClick={() => setShown(shown + PAGE)}>
          Показати ще {Math.min(PAGE, results.length - shown)}
        </button>
      )}
    </main>
  )
}
