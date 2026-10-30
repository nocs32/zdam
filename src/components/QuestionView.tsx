import type { Question } from '../types'

type Props = {
  q: Question
  /** The option the person picked, or null while still deciding. */
  chosen: number | null
  onChoose?: (n: number) => void
  /** Show why (explanations) once answered. Off during the exam. */
  explain: boolean
  /** Show the correct answer without a pick (review of skipped questions, browsing). */
  reveal?: boolean
}

export function QuestionView({ q, chosen, onChoose, explain, reveal = false }: Props) {
  const answered = chosen !== null || reveal
  return (
    <article className="question">
      <p className="q-text">{q.text}</p>
      {q.images.map((src) => (
        <img key={src} className="q-img" src={`img/${src}`} alt="Ілюстрація до питання" loading="lazy" />
      ))}
      <div className="options" role="group" aria-label="Варіанти відповіді">
        {q.options.map((text, i) => {
          const n = i + 1
          const state = !answered ? '' : n === q.correct ? 'is-right' : n === chosen ? 'is-wrong' : 'is-other'
          return (
            <button
              key={n}
              className={`option ${state}`}
              disabled={answered || !onChoose}
              onClick={() => onChoose?.(n)}
              aria-pressed={chosen === n}
            >
              <span className="option-num" aria-hidden="true">
                {state === 'is-right' ? '✓' : state === 'is-wrong' ? '✕' : n}
              </span>
              <span className="option-text">
                <span className="sr-only">Варіант {n}. </span>
                {text}
                {state === 'is-right' && <span className="option-tag">Правильна відповідь</span>}
                {state === 'is-wrong' && <span className="option-tag">Ваша відповідь</span>}
              </span>
            </button>
          )
        })}
      </div>
      {answered && explain && <Why q={q} chosen={chosen} />}
    </article>
  )
}

export function Why({ q, chosen }: { q: Question; chosen: number | null }) {
  const right = chosen === q.correct
  const ex = q.ex
  return (
    <section className={`why ${chosen === null ? 'why-info' : right ? 'why-right' : 'why-wrong'}`} aria-live="polite">
      {chosen === null ? (
        <h2 className="why-head">Правильна відповідь: варіант {q.correct}</h2>
      ) : right ? (
        <h2 className="why-head">Правильно!</h2>
      ) : (
        <>
          <h2 className="why-head">Варіант {chosen} неправильний</h2>
          {ex?.wrong[String(chosen)] && <p>{ex.wrong[String(chosen)]}</p>}
          <h3 className="why-sub">Правильна відповідь: варіант {q.correct}</h3>
        </>
      )}
      {ex ? <p>{ex.correct}</p> : <p className="why-pending">Пояснення до цього питання ще готується.</p>}
      {ex?.rule && <p className="why-rule">Підстава: {ex.rule}</p>}
      {ex?.note && (
        <aside className="why-note">
          <p className="why-note-title">
            <svg className="why-note-sign" viewBox="0 0 48 42" aria-hidden="true">
              <path d="M24 3 L45 39 H3 Z" fill="#fff" stroke="#c8102e" strokeWidth="5" strokeLinejoin="round" />
              <path d="M24 15 V28" stroke="#000" strokeWidth="4.5" strokeLinecap="round" />
              <circle cx="24" cy="33.5" r="2.6" fill="#000" />
            </svg>
            Зверніть увагу
          </p>
          <p>{ex.note}</p>
        </aside>
      )}
    </section>
  )
}
