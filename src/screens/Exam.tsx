import { useEffect, useRef, useState } from 'react'
import type { Bank, ExamRecord, Question } from '../types'
import { recordAnswer, saveExam } from '../store'
import { go } from '../router'
import { shuffle } from '../data'
import { TopBar } from '../components/TopBar'
import { QuestionView } from '../components/QuestionView'

export const EXAM_SIZE = 20
export const EXAM_SECONDS = 20 * 60
export const MAX_MISTAKES = 2

type Run = { qs: Question[]; chosen: (number | null)[]; idx: number; startedAt: number }

export function Exam({ bank }: { bank: Bank }) {
  const [run, setRun] = useState<Run | null>(null)
  if (!run) {
    return (
      <main className="page">
        <TopBar title="Пробний іспит" onBack={() => go()} />
        <section className="plate rules">
          <h2 className="done-title">Як у сервісному центрі</h2>
          <ul className="rules-list">
            <li>{EXAM_SIZE} випадкових питань з усіх тем.</li>
            <li>На все — {EXAM_SECONDS / 60} хвилин.</li>
            <li>Можна помилитися двічі. Третя помилка — іспит не складено.</li>
            <li>Після кожної відповіді видно, чи вона правильна. Пояснення — у кінці.</li>
          </ul>
          <button
            className="btn-sign wide"
            onClick={() =>
              setRun({ qs: shuffle(bank.questions).slice(0, EXAM_SIZE), chosen: Array(EXAM_SIZE).fill(null), idx: 0, startedAt: Date.now() })
            }
          >
            Почати іспит
          </button>
        </section>
      </main>
    )
  }
  return <ExamRun run={run} setRun={setRun} />
}

function ExamRun({ run, setRun }: { run: Run; setRun: (r: Run) => void }) {
  const [now, setNow] = useState(Date.now())
  const finished = useRef(false)
  const { qs, chosen, idx } = run
  const q = qs[idx]
  const mistakes = chosen.filter((c, i) => c !== null && c !== qs[i].correct).length
  const answered = chosen.filter((c) => c !== null).length
  const secondsLeft = Math.max(0, EXAM_SECONDS - Math.floor((now - run.startedAt) / 1000))

  const finish = (reason: ExamRecord['reason']) => {
    if (finished.current) return
    finished.current = true
    const rec: ExamRecord = {
      at: Date.now(),
      passed: reason === 'done' && mistakes <= MAX_MISTAKES,
      reason,
      mistakes,
      answered,
      seconds: Math.min(EXAM_SECONDS, Math.round((Date.now() - run.startedAt) / 1000)),
      items: qs.map((x, i) => ({ id: x.id, chosen: chosen[i] })),
    }
    saveExam(rec)
    go('results', rec.at)
  }

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    if (secondsLeft === 0) finish('time')
  })

  const current = chosen[idx]
  const failedNow = mistakes > MAX_MISTAKES
  const last = idx === qs.length - 1

  const choose = (n: number) => {
    const next = [...chosen]
    next[idx] = n
    recordAnswer(q.id, n === q.correct)
    setRun({ ...run, chosen: next })
  }

  const leave = () => {
    if (window.confirm('Завершити іспит? Результат не буде збережено.')) go()
  }

  const mm = String(Math.floor(secondsLeft / 60))
  const ss = String(secondsLeft % 60).padStart(2, '0')

  return (
    <main className="page has-actionbar">
      <TopBar title="Іспит" onBack={leave} />
      <div className="exam-status">
        <div className={`timer ${secondsLeft < 120 ? 'is-low' : ''}`} role="timer" aria-label={`Залишилось ${mm} хвилин ${ss} секунд`}>
          {mm}:{ss}
        </div>
        <div className="exam-progress">
          <span>
            Питання {idx + 1} з {qs.length}
          </span>
          <span className="strikes" aria-label={`Помилок: ${mistakes}, дозволено ${MAX_MISTAKES}`}>
            Помилки:
            {Array.from({ length: MAX_MISTAKES + 1 }, (_, i) => (
              <span key={i} className={`strike ${i < mistakes ? 'is-on' : ''}`} aria-hidden="true">
                {i < mistakes ? '✕' : ''}
              </span>
            ))}
          </span>
        </div>
      </div>
      <QuestionView key={q.id} q={q} chosen={current} onChoose={choose} explain={false} />
      {current !== null && current !== q.correct && (
        <p className="streak-note">
          {failedNow
            ? 'Це третя помилка. Іспит не складено — подивіться пояснення в результатах.'
            : `Помилка. Можна помилитися ще ${MAX_MISTAKES - mistakes} ${MAX_MISTAKES - mistakes === 1 ? 'раз' : 'рази'}.`}
        </p>
      )}
      <div className="actionbar">
        {current === null ? (
          <p className="actionbar-hint">Оберіть варіант відповіді</p>
        ) : failedNow ? (
          <button className="btn-sign grow" onClick={() => finish('mistakes')} autoFocus>Переглянути результат</button>
        ) : last ? (
          <button className="btn-sign grow" onClick={() => finish('done')} autoFocus>Завершити іспит</button>
        ) : (
          <button className="btn-sign grow" onClick={() => setRun({ ...run, idx: idx + 1 })} autoFocus>Далі</button>
        )}
      </div>
    </main>
  )
}
