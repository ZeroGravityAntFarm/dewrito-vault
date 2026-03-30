import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getGameVersions } from '../api'

export const MAP_TAGS = ['Slayer', 'Infection', 'Puzzle', 'KOTH', 'CTF', 'Assault', 'Territories', 'Oddball', 'Juggernaut', 'VIP', 'Race', 'Mini Games', 'Enhanced', '0.7', '0.5.1']
export const MOD_TAGS = ['vehicle', 'animation', 'object', 'armor', 'ui', 'hud', 'biped', 'weapon', 'campaign', 'mode', 'ability', 'map', 'ai', 'cosmetic', 'misc']
export const MOD_VERSIONS = ['0.7.0', '0.7.1', '0.7.2', '0.6.1', '0.5.1']

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']


export function VersionPicker({ value, onChange }) {
  // Fetch game versions from public endpoint
  const { data, isLoading } = useQuery({
    queryKey: ['game-versions'],
    queryFn: getGameVersions,
    staleTime: 60_000,
  })
  const versions = data?.game_versions ?? []

  return (
    <select
      className="select"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      required
      style={{ width: '10rem' }}
      disabled={isLoading || versions.length === 0}
    >
      <option value="">Select version…</option>
      {versions.map(v => (
        <option key={v} value={v}>{v}</option>
      ))}
    </select>
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
