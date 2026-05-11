import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellIcon, MagnifyingGlassIcon, ArrowRightOnRectangleIcon, Bars3Icon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'

export function TopBar() {
  const [search, setSearch] = useState('')
  const logout = useAuthStore((s) => s.logout)
  const notifications = useUIStore((s) => s.notifications)
  const clearNotifications = useUIStore((s) => s.clearNotifications)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-14 bg-[#111827] border-b border-[#2D3748] flex items-center px-4 lg:px-6 gap-3 shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden p-2 rounded-md text-[#94A3B8] hover:text-[#F7F9FC] hover:bg-[#1C2333] transition-colors"
      >
        <Bars3Icon className="w-5 h-5" />
      </button>

      <div className="flex-1 max-w-md">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B5563]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entities, BVN, alerts..."
            className="w-full bg-[#1C2333] border border-[#2D3748] rounded-md pl-9 pr-4 py-1.5 text-sm text-[#F7F9FC] placeholder:text-[#4B5563] focus:outline-none focus:border-[#00D4AA]/50 font-mono"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <button
          onClick={clearNotifications}
          className="relative p-2 rounded-md text-[#94A3B8] hover:text-[#F7F9FC] hover:bg-[#1C2333] transition-colors"
        >
          <BellIcon className="w-4 h-4" />
          {notifications > 0 && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
          )}
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-[#2D3748]">
          <div className="w-7 h-7 rounded-full bg-[#00D4AA]/20 flex items-center justify-center">
            <span className="text-xs font-semibold text-[#00D4AA]">AO</span>
          </div>
          <span className="hidden sm:block text-sm text-[#94A3B8]">Akeem Jr.</span>
          <button onClick={handleLogout} className="p-1 rounded text-[#4B5563] hover:text-red-400 transition-colors ml-1" title="Logout">
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
