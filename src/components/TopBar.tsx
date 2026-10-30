import type { ReactNode } from 'react'

export function TopBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <header className="topbar">
      {onBack && (
        <button className="btn-back" onClick={onBack}>
          <span aria-hidden="true">‹</span> Назад
        </button>
      )}
      <h1 className="topbar-title">{title}</h1>
      {right}
    </header>
  )
}

export function Meter({ value, total, label }: { value: number; total: number; label: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0
  return (
    <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={value} aria-label={label}>
      <div className="meter-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}
