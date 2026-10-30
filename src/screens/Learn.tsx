import { useMemo, useState } from 'react'
import type { Bank } from '../types'
import { useStore, recordAnswer, setLearnPos, getState, isLearned, learnPosOf } from '../store'
import { go } from '../router'
import { TopBar, Meter } from '../components/TopBar'
import { QuestionView } from '../components/QuestionView'

export function Topics({ bank }: { bank: Bank }) {
  const s = useStore()
  return (
    <main className="page">
      <TopBar title="Вчити за темами" onBack={() => go()} />
      <div className="list">
        {bank.sections.map((sec) => {
          const qs = bank.questions.filter((q) => q.section === sec.id)
          const learned = qs.filter((q) => isLearned(s, q.id)).length
          const done = learned === qs.length
          return (
            <button key={sec.id} className="plate topic" onClick={() => go('learn', sec.id)}>
              <span className="topic-num">{sec.id}</span>
              <span className="topic-body">
                <span className="topic-title">{sec.title}</span>
                <span className="topic-stat">
                  {done ? 'Усе вивчено' : `Вивчено ${learned} з ${qs.length}`}
                </span>
                <Meter value={learned} total={qs.length} label={`Вивчено в темі ${sec.id}`} />
              </span>
            </button>
          )
        })}
      </div>
    </main>
  )
}

export function Learn({ bank, sectionId }: { bank: Bank; sectionId: string }) {
  const section = bank.sections.find((s) => s.id === sectionId)
  const qs = useMemo(() => bank.questions.filter((q) => q.section === sectionId), [bank, sectionId])
  const [idx, setIdx] = useState(() => Math.min(learnPosOf(getState(), sectionId), qs.length))
  const [chosen, setChosen] = useState<number | null>(null)
  const [score, setScore] = useState({ right: 0, wrong: 0 })

  if (!section) return <NotFound />
  const q = qs[idx]

  const move = (to: number) => {
    setIdx(to)
    setChosen(null)
    setLearnPos(sectionId, to >= qs.length ? 0 : to)
    window.scrollTo(0, 0)
  }
  const choose = (n: number) => {
    setChosen(n)
    recordAnswer(q.id, n === q.correct)
    setScore((s) => (n === q.correct ? { ...s, right: s.right + 1 } : { ...s, wrong: s.wrong + 1 }))
  }

  if (!q) {
    return (
      <main className="page">
        <TopBar title={`Тема ${section.id}`} onBack={() => go('topics')} />
        <section className="plate done">
          <h2 className="done-title">Тему пройдено до кінця</h2>
          <p>
            За цей раз: правильно {score.right}, з помилками {score.wrong}. Питання з помилками чекають у розділі «Мої
            помилки».
          </p>
          <div className="stack">
            <button className="btn-sign" onClick={() => move(0)}>Пройти тему ще раз</button>
            <button className="btn-plate" onClick={() => go('topics')}>До списку тем</button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="page has-actionbar">
      <TopBar title={`Тема ${section.id}`} onBack={() => go('topics')} />
      <p className="crumb">{section.title}</p>
      <p className="counter">
        Питання {idx + 1} з {qs.length}
      </p>
      <QuestionView key={q.id} q={q} chosen={chosen} onChoose={choose} explain />
      <div className="actionbar">
        {idx > 0 && (
          <button className="btn-plate" onClick={() => move(idx - 1)}>
            Попереднє
          </button>
        )}
        {chosen === null ? (
          <button className="btn-plate grow" onClick={() => move(idx + 1)}>
            Пропустити
          </button>
        ) : (
          <button className="btn-sign grow" onClick={() => move(idx + 1)} autoFocus>
            Далі
          </button>
        )}
      </div>
    </main>
  )
}

export function NotFound() {
  return (
    <main className="page">
      <TopBar title="Сторінку не знайдено" onBack={() => go()} />
      <p>Такої сторінки немає. Поверніться на головну.</p>
    </main>
  )
}
