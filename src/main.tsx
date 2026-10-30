import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/fira-sans/cyrillic-400.css'
import '@fontsource/fira-sans/cyrillic-500.css'
import '@fontsource/fira-sans/cyrillic-700.css'
import '@fontsource/fira-sans/latin-400.css'
import '@fontsource/fira-sans/latin-700.css'
import './styles.css'
import { App } from './App'
import { startSync } from './sync/sync'

startSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
