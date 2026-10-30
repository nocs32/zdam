import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { go } from '../router'
import { TopBar } from '../components/TopBar'
import { deviceLink, syncNow, useSyncStatus, type SyncStatus } from '../sync/sync'

const timeFmt = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

export function statusText(s: SyncStatus): string {
  switch (s.kind) {
    case 'off':
      return 'Прогрес зберігається лише на цьому пристрої.'
    case 'syncing':
      return 'Зберігаємо прогрес…'
    case 'synced':
      return `Прогрес спільний для всіх ваших пристроїв. Збережено ${timeFmt.format(s.at)}.`
    case 'offline':
      return 'Немає зв’язку. Прогрес збережено тут і з’явиться на інших пристроях, коли повернеться інтернет.'
    case 'badkey':
      return 'Посилання для синхронізації не підходить. Відкрийте правильне посилання ще раз.'
  }
}

export function Devices() {
  const status = useSyncStatus()
  const link = deviceLink()
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (link) QRCode.toString(link, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }).then(setQr, () => setQr(''))
  }, [link])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link!)
      setCopied(true)
    } catch {
      window.prompt('Скопіюйте посилання:', link!)
    }
  }

  return (
    <main className="page">
      <TopBar title="Пристрої" onBack={() => go()} />
      <section className={`plate sync-card is-${status.kind}`}>
        <p className="sync-state">{statusText(status)}</p>
        {status.kind !== 'off' && (
          <button className="btn-plate" onClick={() => void syncNow()} disabled={status.kind === 'syncing'}>
            Синхронізувати зараз
          </button>
        )}
      </section>

      {link ? (
        <section className="block">
          <h2 className="block-title">Додати ще один пристрій</h2>
          <p>
            Наведіть камеру телефона чи планшета на цей код або відкрийте на ньому посилання. Один раз, і далі прогрес буде
            спільним.
          </p>
          {qr && <div className="qr" role="img" aria-label="QR-код посилання" dangerouslySetInnerHTML={{ __html: qr }} />}
          <div className="stack">
            {'share' in navigator && (
              <button className="btn-sign" onClick={() => navigator.share({ title: 'Здам', url: link }).catch(() => {})}>
                Надіслати посилання
              </button>
            )}
            <button className="btn-plate" onClick={copy}>
              {copied ? 'Посилання скопійовано' : 'Скопіювати посилання'}
            </button>
          </div>
          <p className="lead">Це посилання відкриває ваш прогрес. Надсилайте його лише на власні пристрої.</p>
        </section>
      ) : (
        <section className="block">
          <p>
            Щоб бачити однаковий прогрес на телефоні й планшеті, відкрийте на кожному з них особисте посилання для
            синхронізації. Його можна отримати в того, хто налаштовував застосунок.
          </p>
        </section>
      )}
    </main>
  )
}
