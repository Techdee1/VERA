import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Please enter email and password'); return }
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    login({ name: 'Akeem Jr.', email, role: 'CCO' }, 'mock-jwt-token-grace-2026')
    navigate('/dashboard')
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[#F7F9FC]">GR<span className="text-[#00D4AA]">ACE</span></h1>
        <p className="text-sm text-[#94A3B8] mt-1">Compliance Intelligence Platform</p>
      </div>

      <div className="bg-[#111827] border border-[#2D3748] rounded-xl p-8">
        <h2 className="text-base font-semibold text-[#F7F9FC] mb-6">Sign in to your account</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="officer@bank.ng"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</p>}

          <div className="flex items-center justify-end">
            <Link to="/forgot-password" className="text-xs text-[#94A3B8] hover:text-[#00D4AA] transition-colors">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>

        <div className="mt-4 p-3 bg-[#1C2333] rounded-md border border-[#2D3748]">
          <p className="text-[10px] text-[#4B5563] font-mono text-center">Demo: any email + any password</p>
        </div>
      </div>

      <p className="text-center text-[10px] text-[#4B5563] font-mono mt-6">
        © 2026 GRACE · NFIU-compliant · SOC2 Ready
      </p>
    </div>
  )
}
