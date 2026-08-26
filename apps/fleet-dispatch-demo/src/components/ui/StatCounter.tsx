import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

export function StatCounter({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}: {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  const [display, setDisplay] = useState(value)
  const prevValue = useRef(value)

  useEffect(() => {
    const from = prevValue.current
    const to = value
    prevValue.current = value
    if (from === to) return

    const duration = 700
    const start = performance.now()

    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (to - from) * eased)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return (
    <motion.span className={className} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </motion.span>
  )
}
