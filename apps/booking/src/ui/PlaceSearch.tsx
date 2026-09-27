import { useEffect, useMemo, useRef, useState } from 'react'
import { PLACES, type Place } from '../lib/data'

export function PlaceSearch({ value, onChange, placeholder, tone = 'blue' }: { value: Place | null; onChange: (p: Place) => void; placeholder: string; tone?: 'blue' | 'gold' }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [idx, setIdx] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    const list = s ? PLACES.filter((p) => p.name.toLowerCase().includes(s) || p.area.toLowerCase().includes(s)) : PLACES
    return list.slice(0, 6)
  }, [q])

  useEffect(() => {
    const onDoc = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDoc)
    return () => document.removeEventListener('pointerdown', onDoc)
  }, [])

  const pick = (p: Place) => {
    onChange(p)
    setQ('')
    setOpen(false)
  }

  return (
    <div ref={box} className={`search tone-${tone} ${open ? 'is-open' : ''}`}>
      <div className="search__field">
        <span className="search__dot" aria-hidden />
        <input
          value={open ? q : value?.name ?? ''}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true)
            setIdx(0)
          }}
          onChange={(e) => {
            setQ(e.target.value)
            setIdx(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setIdx((i) => Math.min(results.length - 1, i + 1))
            if (e.key === 'ArrowUp') setIdx((i) => Math.max(0, i - 1))
            if (e.key === 'Enter' && results[idx]) pick(results[idx])
            if (e.key === 'Escape') setOpen(false)
          }}
          aria-label={placeholder}
        />
        {value && !open && <span className="search__area">{value.area}</span>}
      </div>
      {open && (
        <ul className="search__list" role="listbox">
          {results.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === idx} className={i === idx ? 'is-active' : ''} onPointerDown={() => pick(p)} onPointerEnter={() => setIdx(i)}>
              <span>{p.name}</span>
              <small>{p.area}</small>
            </li>
          ))}
          {results.length === 0 && <li className="is-empty">No matches. Try “Airport” or “Taipei 101”.</li>}
        </ul>
      )}
    </div>
  )
}
