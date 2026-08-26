import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, ClipboardList, Radar, Car, MapPinned } from 'lucide-react'
import clsx from 'clsx'

const ITEMS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/booking', label: 'Booking', icon: ClipboardList },
  { to: '/control', label: 'Control Center', icon: Radar },
  { to: '/driver', label: 'Driver App', icon: Car },
  { to: '/customer', label: 'Track Ride', icon: MapPinned },
]

export function PersonaSwitcher() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[900] flex justify-center px-4">
      <div className="glass-panel pointer-events-auto flex items-center gap-1 rounded-2xl p-1.5 shadow-2xl">
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              clsx(
                'relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm',
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="persona-pill"
                    className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-cyan-500/25 to-purple-500/25 ring-1 ring-cyan-400/30"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  )
}
