import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center p-4">
      <Outlet />
    </div>
  )
}
