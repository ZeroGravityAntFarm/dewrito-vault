import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { useNavigate } from 'react-router-dom'
import {
  adminGetUsers,
  adminToggleUser,
  adminPromoteUser,
  adminGetSettings,
  adminUpdateSettings,
  adminGetStats,
  adminAddTag,
  adminRemoveTag,
  adminRenameUser,
} from '../api'

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

export default function AdminPage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user?.is_admin) navigate('/')
  }, [user, navigate])

  if (!user?.is_admin) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-text-primary">Admin Panel</h1>
      <StatsCard />
      <SettingsCard />
      <TagsCard />
      <UsersCard currentUserId={user.id} />
    </div>
  )
}

function StatsCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminGetStats,
  })

  return (
    <div className="card p-6 space-y-4">
      <h2 className="text-lg font-semibold text-text-primary">Disk Usage</h2>
      {isLoading ? (
        <p className="text-text-muted text-sm">Loading...</p>
      ) : data ? (
        <div className="grid grid-cols-3 gap-4">
          <StatBox label="Files Used" value={formatBytes(data.static_used_bytes)} />
          <StatBox label="Disk Free" value={formatBytes(data.disk_free_bytes)} />
          <StatBox label="Disk Total" value={formatBytes(data.disk_total_bytes)} />
        </div>
      ) : null}
    </div>
  )
}

function StatBox({ label, value }) {
  return (
    <div className="bg-surface-2 rounded-lg p-4 text-center">
      <p className="text-text-muted text-xs mb-1">{label}</p>
      <p className="text-text-primary font-mono font-semibold text-lg">{value}</p>
    </div>
  )
}

function SettingsCard() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: adminGetSettings,
  })

  const mutation = useMutation({
    mutationFn: (enabled) => adminUpdateSettings(enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-settings'] }),
  })

  return (
    <div className="card p-6 space-y-4">
      <h2 className="text-lg font-semibold text-text-primary">Site Settings</h2>
      {isLoading ? (
        <p className="text-text-muted text-sm">Loading...</p>
      ) : data ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-primary text-sm font-medium">User Registration</p>
            <p className="text-text-muted text-xs">Allow new users to create accounts</p>
          </div>
          <button
            onClick={() => mutation.mutate(!data.registration_enabled)}
            disabled={mutation.isPending}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              data.registration_enabled ? 'bg-accent' : 'bg-surface-3'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                data.registration_enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      ) : null}
    </div>
  )
}

function TagsCard() {
  const qc = useQueryClient()
  const [mapInput, setMapInput] = useState('')
  const [modInput, setModInput] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: adminGetSettings,
  })

  const addMutation = useMutation({
    mutationFn: ({ tagType, tag }) => adminAddTag(tagType, tag),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-settings'] }),
  })

  const removeMutation = useMutation({
    mutationFn: ({ tagType, tag }) => adminRemoveTag(tagType, tag),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-settings'] }),
  })

  function handleAdd(tagType) {
    const input = tagType === 'map' ? mapInput : modInput
    const tag = input.trim()
    if (!tag) return
    addMutation.mutate({ tagType, tag })
    if (tagType === 'map') setMapInput('')
    else setModInput('')
  }

  function handleKeyDown(e, tagType) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd(tagType)
    }
  }

  return (
    <div className="card p-6 space-y-6">
      <h2 className="text-lg font-semibold text-text-primary">Upload Tags</h2>
      {isLoading ? (
        <p className="text-text-muted text-sm">Loading...</p>
      ) : data ? (
        <>
          <TagSection
            label="Map Tags"
            tags={data.map_tags ?? []}
            input={mapInput}
            onInput={setMapInput}
            onAdd={() => handleAdd('map')}
            onKeyDown={(e) => handleKeyDown(e, 'map')}
            onRemove={(tag) => removeMutation.mutate({ tagType: 'map', tag })}
            isPending={addMutation.isPending || removeMutation.isPending}
          />
          <TagSection
            label="Mod Tags"
            tags={data.mod_tags ?? []}
            input={modInput}
            onInput={setModInput}
            onAdd={() => handleAdd('mod')}
            onKeyDown={(e) => handleKeyDown(e, 'mod')}
            onRemove={(tag) => removeMutation.mutate({ tagType: 'mod', tag })}
            isPending={addMutation.isPending || removeMutation.isPending}
          />
        </>
      ) : null}
    </div>
  )
}

function TagSection({ label, tags, input, onInput, onAdd, onKeyDown, onRemove, isPending }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-text-primary">{label}</p>
      <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
        {tags.length === 0 && <span className="text-text-muted text-xs italic">No tags yet</span>}
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-surface-2 border border-border text-text-primary"
          >
            {tag}
            <button
              type="button"
              onClick={() => onRemove(tag)}
              disabled={isPending}
              className="text-text-muted hover:text-red-400 transition-colors disabled:opacity-40 leading-none"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="New tag…"
          className="input flex-1 text-sm"
          disabled={isPending}
        />
        <button
          type="button"
          onClick={onAdd}
          disabled={isPending || !input.trim()}
          className="btn-primary text-sm px-4 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  )
}

function UsersCard({ currentUserId }) {
  const qc = useQueryClient()
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState(null)

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminGetUsers,
  })

  const toggleMutation = useMutation({
    mutationFn: (userId) => adminToggleUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const promoteMutation = useMutation({
    mutationFn: (userId) => adminPromoteUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const renameMutation = useMutation({
    mutationFn: ({ userId, newName }) => adminRenameUser(userId, newName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setRenamingId(null)
      setRenameError(null)
    },
    onError: (err) => setRenameError(err.message),
  })

  function startRename(u) {
    setRenamingId(u.id)
    setRenameValue(u.name?.trim() ?? '')
    setRenameError(null)
  }

  function cancelRename() {
    setRenamingId(null)
    setRenameError(null)
  }

  function submitRename(userId) {
    const name = renameValue.trim()
    if (!name) return setRenameError('Username cannot be empty.')
    renameMutation.mutate({ userId, newName: name })
  }

  return (
    <div className="card p-6 space-y-4">
      <h2 className="text-lg font-semibold text-text-primary">Users</h2>
      {isLoading ? (
        <p className="text-text-muted text-sm">Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-muted border-b border-border">
                <th className="text-left pb-2 pr-4">ID</th>
                <th className="text-left pb-2 pr-4">Username</th>
                <th className="text-left pb-2 pr-4">2FA</th>
                <th className="text-left pb-2 pr-4">Joined</th>
                <th className="text-left pb-2 pr-4">Admin</th>
                <th className="text-left pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} className="border-b border-border/50">
                  <td className="py-2 pr-4 text-text-muted">{u.id}</td>
                  <td className="py-2 pr-4">
                    {renamingId === u.id ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') submitRename(u.id)
                              if (e.key === 'Escape') cancelRename()
                            }}
                            className="input text-xs py-0.5 px-2 w-32"
                            autoFocus
                          />
                          <button
                            onClick={() => submitRename(u.id)}
                            disabled={renameMutation.isPending}
                            className="text-xs px-2 py-0.5 rounded bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-40"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelRename}
                            className="text-xs px-2 py-0.5 rounded bg-surface-3 text-text-muted hover:text-text-primary"
                          >
                            ✕
                          </button>
                        </div>
                        {renameError && <p className="text-red-400 text-xs">{renameError}</p>}
                      </div>
                    ) : (
                      <button
                        onClick={() => startRename(u)}
                        className="text-text-primary font-medium hover:text-accent transition-colors text-left min-w-[4rem] min-h-[1.25rem] block"
                        title="Click to rename"
                      >
                        {u.name?.trim() || <span className="text-text-muted italic">(blank)</span>}
                      </button>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {u.totp_enabled ? (
                      <span className="badge badge-green text-xs">On</span>
                    ) : (
                      <span className="text-text-muted text-xs">Off</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-text-muted text-xs">
                    {u.time_created ? new Date(u.time_created).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-2 pr-4">
                    <button
                      onClick={() => promoteMutation.mutate(u.id)}
                      disabled={promoteMutation.isPending || u.id === currentUserId}
                      title={u.id === currentUserId ? 'Cannot change your own admin status' : ''}
                      className={`text-xs px-3 py-1 rounded font-medium transition-colors disabled:opacity-40 ${
                        u.is_admin
                          ? 'bg-yellow-900/40 text-yellow-400 hover:bg-yellow-900/60'
                          : 'bg-surface-3 text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {u.is_admin ? 'Demote' : 'Promote'}
                    </button>
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => toggleMutation.mutate(u.id)}
                      disabled={toggleMutation.isPending || u.id === currentUserId}
                      title={u.id === currentUserId ? 'Cannot disable your own account' : ''}
                      className={`text-xs px-3 py-1 rounded font-medium transition-colors disabled:opacity-40 ${
                        u.is_active
                          ? 'bg-red-900/40 text-red-400 hover:bg-red-900/60'
                          : 'bg-green-900/40 text-green-400 hover:bg-green-900/60'
                      }`}
                    >
                      {u.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
