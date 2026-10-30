import { useMemo, useState } from 'react'
import type { Bank } from '../types'
import { useStore, recordAnswer, getState, pileIds, MISTAKE_STREAK_TO_CLEAR } from '../store'
import { go } from '../router'
import { byId, shuffle, plural } from '../data'
import { TopBar } from '../components/TopBar'
import { QuestionView } from '../components/QuestionView'

export function Mistakes({ bank }: { bank: Bank }) {
  const s = useStore()
  const ids = pileIds(s)
  const sections = new Map(bank.sections.map((x) => [x.id, x.title]))
  const qmap = useMemo(() => byId(bank), [bank])

  return (
    <main className="page">
      <TopBar title="Мої помилки" onBack={() => go()} />
      {ids.length === 0 ? (
        <section className="plate done">
          <h2 className="done-title">Помилок немає</h2>
          <p>
            Коли ви відповісте неправильно, питання потрапить сюди. Воно зникне, щойно ви відповісте на нього правильно
            двічі поспіль.
          </p>
          <button className="btn-sign" onClick={() => go('topics')}>Вчити за темами</button>
        </section>
      ) : (
        <>
          <p className="lead">
            {ids.length} {plural(ids.length, 'питання', 'питання', 'питань')} з помилками. Кожне зникне звідси після двох
            правильних відповідей поспіль.
          </p>
          <button className="btn-sign wide" onClick={() => go('mistakes', 'run')}>
            Повторити помилки
          </button>
          <div className="list">
            {ids.map((id) => {
              const q = qmap.get(id)
              if (!q) return null
              return (
                <div key={id} className="plate mini">
                  <span className="mini-meta">
                    Тема {q.section}. {sections.get(q.section)}
                  </span>
                  <span className="mini-text">{q.text}</span>
                  <span className="mini-meta">
                    Правильних поспіль: {s.mistakes[id].s} з {MISTAKE_STREAK_TO_CLEAR}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </main>
  )
}

export function MistakesRun({ bank }: { bank: Bank }) {
  const s = useStore()
  const qmap = useMemo(() => byId(bank), [bank])
  const [queue, setQueue] = useState(() => shuffle(pileIds(getState())))
  const [chosen, setChosen] = useState<number | null>(null)
  const left = pileIds(s).length

  const next = () => {
    setChosen(null)
    let rest = queue.slice(1)
    if (rest.length === 0) rest = shuffle(pileIds(getState()))
    setQueue(rest)
    window.scrollTo(0, 0)
  }

  const q = queue.length ? qmap.get(queue[0]) : undefined
  if (!q || (left === 0 && chosen === null)) {
    return (
      <main className="page">
        <TopBar title="Повторення помилок" onBack={() => go('mistakes')} />
        <section className="plate done">
          <h2 className="done-title">Усі помилки виправлено</h2>
          <p>Кожне питання ви розв’язали правильно двічі поспіль. Так тримати!</p>
          <button className="btn-sign" onClick={() => go()}>На головну</button>
        </section>
      </main>
    )
  }

  const cleared = s.mistakes[q.id]?.gone === true
  return (
    <main className="page has-actionbar">
      <TopBar title="Повторення помилок" onBack={() => go('mistakes')} />
      <p className="counter">
        Залишилось у помилках: {left}
      </p>
      <QuestionView
        key={q.id + queue.length}
        q={q}
        chosen={chosen}
        onChoose={(n) => {
          setChosen(n)
          recordAnswer(q.id, n === q.correct)
        }}
        explain
      />
      {chosen !== null && (
        <p className="streak-note">
          {chosen !== q.correct
            ? 'Лічильник почався заново: потрібно дві правильні відповіді поспіль.'
            : cleared
              ? 'Друга правильна відповідь поспіль. Питання прибрано з помилок.'
              : 'Ще одна правильна відповідь, і питання зникне з помилок.'}
        </p>
      )}
      <div className="actionbar">
        {chosen === null ? (
          <button className="btn-plate grow" onClick={next}>Пропустити</button>
        ) : (
          <button className="btn-sign grow" onClick={next} autoFocus>Далі</button>
        )}
      </div>
    </main>
  )
}
