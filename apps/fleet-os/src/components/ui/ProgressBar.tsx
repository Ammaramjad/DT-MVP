import { motion } from 'framer-motion'

export function ProgressBar({ progress, tone = 'cyan' }: { progress: number; tone?: 'cyan' | 'amber' }) {
  const gradient = tone === 'cyan' ? 'from-cyan-400 to-purple-400' : 'from-amber-400 to-pink-400'
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <motion.div
        className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
        animate={{ width: `${Math.min(100, Math.max(2, progress * 100))}%` }}
        transition={{ duration: 1.1, ease: 'linear' }}
      />
    </div>
  )
}
