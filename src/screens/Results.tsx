import { useMemo } from 'react'
import type { Bank, ExamRecord } from '../types'
import { useStore } from '../store'
import { go } from '../router'
import { byId } from '../data'
import { TopBar } from '../components/TopBar'
import { QuestionView } from '../components/QuestionView'
import { NotFound } from './Learn'

const dateFmt = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

function verdict(e: ExamRecord) {
  if (e.passed) return 'Складено'
  return e.reason === 'time' ? 'Не складено: скінчився час' : 'Не складено: три помилки'
}

export function ExamRow({ e }: { e: ExamRecord }) {
  return (
    <button className={`plate exam-row ${e.passed ? 'is-pass' : 'is-fail'}`} onClick={() => go('results', e.at)}>
      <span className="exam-mark" aria-hidden="true">{e.passed ? '✓' : '✕'}</span>
      <span className="exam-row-body">
        <span className="exam-row-title">{verdict(e)}</span>
        <span className="exam-row-meta">
          {dateFmt.format(e.at)}, помилок: {e.mistakes}
        </span>
      </span>
    </button>
  )
}

export function ResultsList() {
  const s = useStore()
  return (
    <main className="page">
      <TopBar title="Результати іспитів" onBack={() => go()} />
      {s.exams.length === 0 ? (
        <section className="plate done">
          <p>Ви ще не складали пробний іспит.</p>
          <button className="btn-sign" onClick={() => go('exam')}>Скласти пробний іспит</button>
        </section>
      ) : (
        <div className="list">
          {s.exams.map((e) => (
            <ExamRow key={e.at} e={e} />
          ))}
        </div>
      )}
    </main>
  )
}

export function Result({ bank, at }: { bank: Bank; at: number }) {
  const s = useStore()
  const qmap = useMemo(() => byId(bank), [bank])
  const e = s.exams.find((x) => x.at === at)
  if (!e) return <NotFound />
  const m = Math.floor(e.seconds / 60), sec = e.seconds % 60
  const wrongFirst = [...e.items].sort((a, b) => score(a) - score(b))
  function score(it: { id: string; chosen: number | null }) {
    const q = qmap.get(it.id)
    return it.chosen === null ? 2 : it.chosen === q?.correct ? 1 : 0
  }

  return (
    <main className="page">
      <TopBar title="Результат іспиту" onBack={() => go()} />
      <section className={`verdict ${e.passed ? 'is-pass' : 'is-fail'}`}>
        <p className="verdict-title">{verdict(e)}</p>
        <p>
          Відповідей: {e.answered} з {e.items.length}. Помилок: {e.mistakes}. Час: {m} хв {sec} с.
        </p>
      </section>
      <div className="stack">
        <button className="btn-sign" onClick={() => go('exam')}>Скласти ще один іспит</button>
        {e.mistakes > 0 && <button className="btn-plate" onClick={() => go('mistakes', 'run')}>Повторити помилки</button>}
      </div>
      <h2 className="block-title">Розбір питань</h2>
      <p className="lead">Спершу питання з помилками, потім правильні, у кінці ті, до яких не дійшли.</p>
      {wrongFirst.map((it) => {
        const q = qmap.get(it.id)
        if (!q) return null
        const status = it.chosen === null ? 'Без відповіді' : it.chosen === q.correct ? 'Правильно' : 'Помилка'
        return (
          <div key={it.id} className="review-item">
            <p className="review-head">
              {status}. Тема {q.section}, питання {q.n}
            </p>
            <QuestionView q={q} chosen={it.chosen} reveal explain />
          </div>
        )
      })}
    </main>
  )
}
