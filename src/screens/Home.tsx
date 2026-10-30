import type { Bank } from '../types'
import { useStore, setTextSize, isLearned, pileIds } from '../store'
import { go } from '../router'
import { Meter } from '../components/TopBar'
import { plural } from '../data'
import { ExamRow } from './Results'
import { useSyncStatus } from '../sync/sync'
import { statusText } from './Devices'

export function Home({ bank }: { bank: Bank }) {
  const s = useStore()
  const total = bank.questions.length
  const learned = bank.questions.filter((q) => isLearned(s, q.id)).length
  const pile = pileIds(s).length
  const sync = useSyncStatus()

  return (
    <main className="page">
      <section className="hero sign-blue">
        <p className="hero-name">Здам</p>
        <p className="hero-sub">Іспит з ПДР, категорія B</p>
        <p className="hero-stat">
          Вивчено {learned} з {total} {plural(total, 'питання', 'питань', 'питань')}
        </p>
        <Meter value={learned} total={total} label="Вивчено питань" />
      </section>

      <nav className="menu" aria-label="Розділи застосунку">
        <button className="plate menu-item" onClick={() => go('topics')}>
          <span className="menu-title">Вчити за темами</span>
          <span className="menu-note">Відповідь і пояснення одразу після кожного питання</span>
        </button>
        <button className="plate menu-item" onClick={() => go('exam')}>
          <span className="menu-title">Пробний іспит</span>
          <span className="menu-note">20 питань, 20 хвилин, третя помилка — не склав</span>
        </button>
        <button className="plate menu-item" onClick={() => go('mistakes')}>
          <span className="menu-title">
            Мої помилки {pile > 0 && <span className="count-badge">{pile}</span>}
          </span>
          <span className="menu-note">
            {pile ? 'Повторіть, доки не відповісте правильно двічі поспіль' : 'Тут з’являться питання, де ви помилились'}
          </span>
        </button>
        <button className="plate menu-item" onClick={() => go('browse')}>
          <span className="menu-title">Усі питання й відповіді</span>
          <span className="menu-note">Пошук по всіх {total} питаннях</span>
        </button>
      </nav>

      {s.exams.length > 0 && (
        <section className="block">
          <h2 className="block-title">Останні іспити</h2>
          <div className="list">
            {s.exams.slice(0, 3).map((e) => (
              <ExamRow key={e.at} e={e} />
            ))}
          </div>
          {s.exams.length > 3 && (
            <button className="btn-plain" onClick={() => go('results')}>
              Усі результати ({s.exams.length})
            </button>
          )}
        </section>
      )}

      <section className="block">
        <h2 className="block-title">Пристрої</h2>
        <button className={`plate menu-item sync-row is-${sync.kind}`} onClick={() => go('devices')}>
          <span className="menu-note">{statusText(sync)}</span>
          <span className="sync-more">Телефон, планшет, комп’ютер</span>
        </button>
      </section>

      <section className="block">
        <h2 className="block-title">Розмір тексту</h2>
        <div className="seg" role="radiogroup" aria-label="Розмір тексту">
          {(['Звичайний', 'Великий', 'Дуже великий'] as const).map((label, i) => (
            <button
              key={label}
              role="radio"
              aria-checked={s.textSize === i}
              className={`seg-item ${s.textSize === i ? 'is-on' : ''}`}
              onClick={() => setTextSize(i as 0 | 1 | 2)}
              style={{ fontSize: `${[1, 1.15, 1.3][i]}rem` }}
            >
              А<span className="sr-only"> {label}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
