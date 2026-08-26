import type { ReactNode } from 'react'
import clsx from 'clsx'
import { motion, type HTMLMotionProps } from 'framer-motion'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:brightness-110',
  secondary: 'bg-white/8 text-slate-100 ring-1 ring-white/15 hover:bg-white/14',
  ghost: 'bg-transparent text-slate-300 hover:bg-white/8',
  danger: 'bg-red-500/15 text-red-300 ring-1 ring-red-400/30 hover:bg-red-500/25',
  success: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30 hover:bg-emerald-500/25',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3.5 text-base',
}

interface Props extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  fullWidth?: boolean
  children?: ReactNode
}

export function Button({ variant = 'primary', size = 'md', icon, fullWidth, className, children, ...rest }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: rest.disabled ? 1 : 1.02 }}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </motion.button>
  )
}
