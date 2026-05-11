import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const sections = [
  { id: 'profile', label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'api', label: 'API Configuration' },
  { id: 'security', label: 'Security' },
]

export default function Settings() {
  const [active, setActive] = useState('profile')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Platform configuration" />

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 shrink-0">
          <nav className="space-y-0.5">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  active === s.id
                    ? 'bg-[#00D4AA]/10 text-[#00D4AA]'
                    : 'text-[#94A3B8] hover:bg-[#1C2333] hover:text-[#F7F9FC]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-[#111827] border border-[#2D3748] rounded-lg p-6">
          {active === 'profile' && (
            <div className="space-y-4 max-w-md">
              <h3 className="text-sm font-semibold text-[#F7F9FC] mb-4">Profile Settings</h3>
              <Input label="Full Name" defaultValue="Akeem Jr." />
              <Input label="Email" type="email" defaultValue="akeem@bank.ng" />
              <Input label="Role" defaultValue="Chief Compliance Officer" />
              <Input label="Institution" defaultValue="First Bank Nigeria" />
            </div>
          )}

          {active === 'notifications' && (
            <div className="space-y-4 max-w-md">
              <h3 className="text-sm font-semibold text-[#F7F9FC] mb-4">Notification Preferences</h3>
              {[
                { label: 'High Risk Alerts', desc: 'Notify immediately when HIGH risk alert is detected' },
                { label: 'STR Status Changes', desc: 'Notify when STR status is updated' },
                { label: 'New Entity Flags', desc: 'Notify when entity risk score changes significantly' },
                { label: 'Daily Digest', desc: 'Daily summary of all compliance activity' },
              ].map((item) => (
                <label key={item.label} className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="mt-0.5 accent-[#00D4AA]" />
                  <div>
                    <p className="text-sm text-[#F7F9FC]">{item.label}</p>
                    <p className="text-xs text-[#94A3B8]">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {active === 'api' && (
            <div className="space-y-4 max-w-md">
              <h3 className="text-sm font-semibold text-[#F7F9FC] mb-4">API Configuration</h3>
              <Input label="API Base URL" defaultValue="http://localhost:8000/api/v1" />
              <Input label="API Key" type="password" defaultValue="••••••••••••••••" />
              <div>
                <p className="text-xs text-[#4B5563] uppercase tracking-wider mb-2">AI Model</p>
                <select className="w-full bg-[#1C2333] border border-[#2D3748] rounded-md px-3 py-2 text-sm text-[#F7F9FC] focus:outline-none focus:border-[#00D4AA]/50">
                  <option>llama-3.3-70b</option>
                  <option>gpt-4o</option>
                  <option>claude-3-5-sonnet</option>
                </select>
              </div>
            </div>
          )}

          {active === 'security' && (
            <div className="space-y-4 max-w-md">
              <h3 className="text-sm font-semibold text-[#F7F9FC] mb-4">Security Settings</h3>
              <div className="p-4 bg-[#1C2333] border border-[#2D3748] rounded-lg">
                <p className="text-sm font-medium text-[#F7F9FC] mb-1">Two-Factor Authentication</p>
                <p className="text-xs text-[#94A3B8] mb-3">Add an extra layer of security to your account</p>
                <Button variant="secondary" size="sm">Enable 2FA</Button>
              </div>
              <div className="p-4 bg-[#1C2333] border border-[#2D3748] rounded-lg">
                <p className="text-sm font-medium text-[#F7F9FC] mb-1">Session Management</p>
                <p className="text-xs text-[#94A3B8] mb-3">Active sessions: 1 device</p>
                <Button variant="danger" size="sm">Revoke All Sessions</Button>
              </div>
              <Input label="Change Password" type="password" placeholder="New password" />
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-[#2D3748] flex items-center gap-3">
            <Button variant="primary" onClick={handleSave}>
              {saved ? '✓ Saved' : 'Save Changes'}
            </Button>
            <Button variant="ghost">Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
