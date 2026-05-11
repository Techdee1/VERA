import { NavLink } from 'react-router-dom'
import {
  Squares2X2Icon, ChartBarIcon, BellAlertIcon, UserGroupIcon,
  DocumentTextIcon, ClipboardDocumentListIcon, Cog6ToothIcon, XMarkIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/utils/cn'
import { useUIStore } from '@/store/uiStore'
import { motion, AnimatePresence } from 'framer-motion'

const navItems = [
  { to: '/dashboard', icon: Squares2X2Icon,           label: 'Dashboard' },
  { to: '/graph',     icon: ChartBarIcon,              label: 'Graph Explorer' },
  { to: '/alerts',    icon: BellAlertIcon,             label: 'Alerts' },
  { to: '/entities',  icon: UserGroupIcon,             label: 'Entities' },
  { to: '/str',       icon: DocumentTextIcon,          label: 'STR Reports' },
  { to: '/audit',     icon: ClipboardDocumentListIcon, label: 'Audit Log' },
]

function SidebarContent({ onClose }) {
  return (
    <aside className="w-56 h-full bg-[#111827] border-r border-[#2D3748] flex flex-col">
      <div className="h-16 flex items-center px-5 border-b border-[#2D3748] justify-between">
        <NavLink to="/" onClick={onClose} className="flex items-center gap-2 group">
          <span className="text-lg font-bold tracking-tight text-[#F7F9FC] group-hover:text-white transition-colors">
            GR<span className="text-[#00D4AA]">ACE</span>
          </span>
          <span className="text-[10px] text-[#4B5563] font-mono group-hover:text-[#94A3B8] transition-colors">v1.0</span>
        </NavLink>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded text-[#4B5563] hover:text-[#F7F9FC] lg:hidden">
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
              isActive
                ? 'bg-[#00D4AA]/10 text-[#00D4AA]'
                : 'text-[#94A3B8] hover:bg-[#1C2333] hover:text-[#F7F9FC]'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-[#2D3748]">
        <NavLink
          to="/settings"
          onClick={onClose}
          className={({ isActive }) => cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
            isActive ? 'bg-[#00D4AA]/10 text-[#00D4AA]' : 'text-[#4B5563] hover:text-[#F7F9FC] hover:bg-[#1C2333]'
          )}
        >
          <Cog6ToothIcon className="w-4 h-4" />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:flex shrink-0 h-screen">
        <SidebarContent />
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={toggleSidebar}
            />
            <motion.div
              initial={{ x: -224 }}
              animate={{ x: 0 }}
              exit={{ x: -224 }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="fixed left-0 top-0 h-full z-50 lg:hidden"
            >
              <SidebarContent onClose={toggleSidebar} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
