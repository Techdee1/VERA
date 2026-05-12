import { useState } from 'react'

export function STREditor({ content, onChange, readOnly = false }) {
  const [value, setValue] = useState(content)

  const handleChange = (e) => {
    setValue(e.target.value)
    onChange?.(e.target.value)
  }

  return (
    <div className="bg-[#111827] border border-[#2D3748] rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-[#1C2333] border-b border-[#2D3748] flex items-center justify-between">
        <span className="text-xs text-[#4B5563] uppercase tracking-wider">STR Draft</span>
        {!readOnly && <span className="text-[10px] text-[#00D4AA]">Editable</span>}
      </div>
      <textarea
        value={value}
        onChange={handleChange}
        readOnly={readOnly}
        rows={20}
        className="w-full bg-transparent p-4 text-sm text-[#F7F9FC] font-mono resize-none focus:outline-none leading-relaxed"
        style={{ minHeight: '400px' }}
      />
    </div>
  )
}
