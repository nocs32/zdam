import { useEffect } from 'react'
import { useBank } from './data'
import { useRoute } from './router'
import { useStore } from './store'
import { Home } from './screens/Home'
import { Topics, Learn, NotFound } from './screens/Learn'
import { Mistakes, MistakesRun } from './screens/Mistakes'
import { Exam } from './screens/Exam'
import { Result, ResultsList } from './screens/Results'
import { Browse } from './screens/Browse'
import { Devices } from './screens/Devices'

export function App() {
  const { bank, error } = useBank()
  const route = useRoute()
  const { textSize } = useStore()

  useEffect(() => {
    document.documentElement.dataset.size = String(textSize)
  }, [textSize])

  if (error) {
    return (
      <main className="page">
        <section className="plate done">
          <h1 className="done-title">Не вдалося завантажити питання</h1>
          <p>Перевірте інтернет і оновіть сторінку. Після першого завантаження застосунок працює і без інтернету.</p>
          <button className="btn-sign" onClick={() => window.location.reload()}>Оновити сторінку</button>
        </section>
      </main>
    )
  }
  if (!bank) return <main className="page loading">Завантаження питань…</main>

  const [screen, a] = route
  switch (screen) {
    case undefined:
      return <Home bank={bank} />
    case 'topics':
      return <Topics bank={bank} />
    case 'learn':
      return a ? <Learn key={a} bank={bank} sectionId={a} /> : <Topics bank={bank} />
    case 'mistakes':
      return a === 'run' ? <MistakesRun bank={bank} /> : <Mistakes bank={bank} />
    case 'exam':
      return <Exam bank={bank} />
    case 'results':
      return a ? <Result bank={bank} at={Number(a)} /> : <ResultsList />
    case 'browse':
      return <Browse bank={bank} />
    case 'devices':
      return <Devices />
    default:
      return <NotFound />
  }
}
