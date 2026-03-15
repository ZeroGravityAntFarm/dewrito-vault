import { useState } from 'react'

export const MAP_TAGS = ['Slayer', 'Infection', 'Puzzle', 'KOTH', 'CTF', 'Assault', 'Territories', 'Oddball', 'Juggernaut', 'VIP', 'Race', 'Mini Games', 'Enhanced', '0.7', '0.5.1']
export const MOD_TAGS = ['vehicle', 'animation', 'object', 'armor', 'ui', 'hud', 'biped', 'weapon', 'campaign', 'mode', 'ability', 'map', 'ai', 'cosmetic', 'misc']
export const MOD_VERSIONS = ['0.7.0', '0.7.1', '0.7.2', '0.6.1', '0.5.1']

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

export function VersionPicker({ value, onChange }) {
  const init = value ? value.split('.') : ['', '', '']
  const [parts, setParts] = useState(init)

  function update(idx, digit) {
    const next = [...parts]
    next[idx] = digit
    setParts(next)
    onChange(next.every((p) => p !== '') ? next.join('.') : '')
  }

  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((idx) => (
        <>
          {idx > 0 && <span key={`dot-${idx}`} className="text-[#484f58] font-mono select-none">.</span>}
          <select
            key={idx}
            value={parts[idx]}
            onChange={(e) => update(idx, e.target.value)}
            className="select"
            style={{ width: '4.5rem' }}
          >
            <option value="">—</option>
            {DIGITS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </>
      ))}
    </div>
  )
}

export default function TagPicker({ tags, selected, onChange }) {
  function toggle(tag) {
    onChange(
      selected.includes(tag)
        ? selected.filter((t) => t !== tag)
        : [...selected, tag]
    )
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => toggle(tag)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
            selected.includes(tag)
              ? 'bg-accent/20 border-accent text-accent'
              : 'bg-surface-2 border-border text-[#8b949e] hover:border-[#444c56] hover:text-[#cdd9e5]'
          }`}
        >
          {tag}
        </button>
      ))}
    </div>
  )
}
