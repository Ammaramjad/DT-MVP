import { useEffect, useState } from 'react'
import type { Copy } from '../lib/experienceCopy'
import { useStore } from '../store'

const links = ['book', 'services', 'business', 'about'] as const

export function GlobalNavigation({ copy }: { copy: Copy }) {
  const [open, setOpen] = useState(false)
  const locale = useStore(state => state.locale)
  const setLocale = useStore(state => state.setLocale)

  useEffect(() => {
    const close = () => setOpen(false)
    window.addEventListener('hashchange', close)
    return () => window.removeEventListener('hashchange', close)
  }, [])

  return <header className="global-nav">
    <a className="wordmark" href="#top" aria-label="Fleet OS home">
      <span className="wordmark-symbol" aria-hidden="true"><i /><i /></span>
      <strong>FLEET <em>OS</em></strong>
    </a>
    <nav id="primary-navigation" className={open ? 'is-open' : ''} aria-label={copy.primaryNav}>
      {copy.nav.map((label, index) => <a key={links[index]} href={`#${links[index]}`} onClick={() => setOpen(false)}>{label}</a>)}
    </nav>
    <div className="nav-actions">
      <label className="language-control"><span className="sr-only">{copy.language}</span>
        <select aria-label={copy.language} value={locale} onChange={event => setLocale(event.target.value as 'en' | 'zh-TW')}>
          <option value="en">EN</option><option value="zh-TW">繁中</option>
        </select>
      </label>
      <a className="nav-book" href="#book">{copy.bookRide}<span aria-hidden="true">↗</span></a>
      <button className="nav-toggle" type="button" aria-expanded={open} aria-controls="primary-navigation" aria-label={copy.menu} onClick={() => setOpen(value => !value)}>
        <i /><i />
      </button>
    </div>
  </header>
}
