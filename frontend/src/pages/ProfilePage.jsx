import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUserMaps, getUserMods, updateUser, uploadAvatar, getWebhooks, createWebhook, updateWebhook, deleteWebhook, get2FAStatus, setup2FA, enable2FA, disable2FA, changePassword } from '../api'
import { useAuthStore } from '../store/auth'
import { MapCard, ModCard, CardGrid, SkeletonCard } from '../components/ContentCard'

const DEFAULT_AVATAR = '/content/default/forge.jpg'

function Tab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-accent text-[#e6edf3]'
          : 'border-transparent text-[#8b949e] hover:text-[#cdd9e5]'
      }`}
    >
      {children}
    </button>
  )
}

export default function ProfilePage() {
  const { user, logout, setUser } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState('maps')
  const [editing, setEditing] = useState(false)
  const [about, setAbout] = useState(user?.about || '')
  const [saveStatus, setSaveStatus] = useState(null)
  const [avatarKey, setAvatarKey] = useState(0)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef(null)

  if (!user) {
    navigate('/login')
    return null
  }

  const { data: maps, isLoading: mapsLoading } = useQuery({
    queryKey: ['userMaps'],
    queryFn: getUserMaps,
    enabled: tab === 'maps',
  })

  const { data: mods, isLoading: modsLoading } = useQuery({
    queryKey: ['userMods'],
    queryFn: getUserMods,
    enabled: tab === 'mods',
  })

  const { data: webhooks, isLoading: webhooksLoading } = useQuery({
    queryKey: ['userWebhooks'],
    queryFn: getWebhooks,
    enabled: tab === 'webhooks',
  })

  async function handleSave() {
    try {
      await updateUser({ about })
      setUser({ ...user, about })
      setEditing(false)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 2000)
    } catch (err) {
      setSaveStatus('error')
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await uploadAvatar(fd)
      setAvatarKey((k) => k + 1)
    } catch (err) {
      alert('Failed to upload avatar: ' + err.message)
    } finally {
      setAvatarUploading(false)
      e.target.value = ''
    }
  }

  const avatarUrl = `/content/avatars/${user.id}.jpg${avatarKey ? `?t=${avatarKey}` : ''}`

  return (
    <div className="max-w-4xl mx-auto">
      {/* Profile header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-5 flex-wrap">
          {/* Avatar */}
          <div className="relative shrink-0 group">
            <img
              src={avatarUrl}
              alt={user.name}
              key={avatarKey}
              className="w-20 h-20 rounded-full object-cover bg-surface-3"
              onError={(e) => { e.target.src = DEFAULT_AVATAR }}
            />
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              title="Change avatar"
            >
              {avatarUploading ? (
                <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[#e6edf3]">{user.name}</h1>
            {user.rank && <span className="badge badge-green mt-2 inline-block">{user.rank}</span>}
          </div>

          <div className="flex gap-2 shrink-0">
            <button onClick={() => setEditing((v) => !v)} className="btn-secondary text-sm">
              {editing ? 'Cancel' : 'Edit Profile'}
            </button>
            <button onClick={() => { logout(); navigate('/') }} className="btn-danger text-sm">
              Logout
            </button>
          </div>
        </div>

        {editing ? (
          <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4">
            <label className="text-sm text-[#8b949e]">About</label>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={3}
              className="input resize-none"
              maxLength={500}
            />
            <div className="flex gap-2">
              <button onClick={handleSave} className="btn-primary text-sm">Save</button>
              {saveStatus === 'saved' && <span className="text-accent text-sm self-center">Saved!</span>}
              {saveStatus === 'error' && <span className="text-[#f85149] text-sm self-center">Error saving.</span>}
            </div>
          </div>
        ) : user.about ? (
          <p className="text-[#cdd9e5] text-sm mt-5 leading-relaxed border-t border-border pt-4">{user.about}</p>
        ) : null}
      </div>

      {/* Content tabs */}
      <div className="border-b border-border mb-6 flex">
        <Tab active={tab === 'maps'} onClick={() => setTab('maps')}>
          Maps {maps?.length != null ? `(${maps.length})` : ''}
        </Tab>
        <Tab active={tab === 'mods'} onClick={() => setTab('mods')}>
          Mods {mods?.length != null ? `(${mods.length})` : ''}
        </Tab>
        <Tab active={tab === 'webhooks'} onClick={() => setTab('webhooks')}>
          Webhooks {webhooks?.length != null ? `(${webhooks.length})` : ''}
        </Tab>
        <Tab active={tab === 'security'} onClick={() => setTab('security')}>
          Security
        </Tab>
      </div>

      {tab === 'maps' && (
        mapsLoading
          ? <CardGrid>{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</CardGrid>
          : maps?.length
            ? <CardGrid>{maps.map((m) => <MapCard key={m.id} map={m} />)}</CardGrid>
            : <p className="text-[#8b949e] text-center py-12">No maps uploaded yet.</p>
      )}

      {tab === 'mods' && (
        modsLoading
          ? <CardGrid>{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</CardGrid>
          : mods?.length
            ? <CardGrid>{mods.map((m) => <ModCard key={m.id} mod={m} />)}</CardGrid>
            : <p className="text-[#8b949e] text-center py-12">No mods uploaded yet.</p>
      )}

      {tab === 'webhooks' && (
        <WebhooksTab webhooks={webhooks} loading={webhooksLoading} qc={qc} />
      )}

      {tab === 'security' && (
        <SecurityTab user={user} qc={qc} />
      )}
    </div>
  )
}

function SecurityTab({ user, qc }) {
  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['2fa-status'],
    queryFn: get2FAStatus,
  })
  const twoFAEnabled = status?.totp_enabled ?? false

  // 2FA setup state
  const [setupData, setSetupData] = useState(null) // { secret, qr }
  const [setupCode, setSetupCode] = useState('')
  const [setupError, setSetupError] = useState(null)
  const [setupLoading, setSetupLoading] = useState(false)

  // 2FA disable state
  const [disabling, setDisabling] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [disableError, setDisableError] = useState(null)
  const [disableLoading, setDisableLoading] = useState(false)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwTotpCode, setPwTotpCode] = useState('')
  const [pwError, setPwError] = useState(null)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  async function handleSetup() {
    setSetupLoading(true)
    setSetupError(null)
    try {
      const data = await setup2FA()
      setSetupData(data)
    } catch (err) {
      setSetupError(err.message)
    } finally {
      setSetupLoading(false)
    }
  }

  async function handleEnable() {
    setSetupLoading(true)
    setSetupError(null)
    try {
      await enable2FA(setupCode)
      setSetupData(null)
      setSetupCode('')
      refetchStatus()
    } catch (err) {
      setSetupError(err.message)
    } finally {
      setSetupLoading(false)
    }
  }

  async function handleDisable() {
    setDisableLoading(true)
    setDisableError(null)
    try {
      await disable2FA(disableCode)
      setDisabling(false)
      setDisableCode('')
      refetchStatus()
    } catch (err) {
      setDisableError(err.message)
    } finally {
      setDisableLoading(false)
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault()
    setPwError(null)
    setPwSuccess(false)
    if (newPassword !== confirmPassword) return setPwError("Passwords don't match.")
    if (newPassword.length < 8) return setPwError('Password must be at least 8 characters.')
    if (!currentPassword && !pwTotpCode) return setPwError(twoFAEnabled ? 'Enter your current password or authenticator code.' : 'Current password is required.')
    setPwLoading(true)
    try {
      await changePassword(newPassword, currentPassword || null, pwTotpCode || null)
      setPwSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPwTotpCode('')
    } catch (err) {
      setPwError(err.message)
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Password change */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#cdd9e5]">Change Password</h2>
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8b949e]">
              Current password{twoFAEnabled ? <span className="text-[#8b949e]"> (or use authenticator code below)</span> : <span className="text-[#f85149]"> *</span>}
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input text-sm"
              autoComplete="current-password"
            />
          </div>
          {twoFAEnabled && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#8b949e]">Authenticator code <span className="text-[#8b949e]">(or use current password above)</span></label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pwTotpCode}
                onChange={(e) => setPwTotpCode(e.target.value.replace(/\D/g, ''))}
                className="input text-sm"
                placeholder="6-digit code"
              />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8b949e]">New password <span className="text-[#f85149]">*</span></label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input text-sm"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8b949e]">Confirm new password <span className="text-[#f85149]">*</span></label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input text-sm"
              autoComplete="new-password"
              required
            />
          </div>
          {pwError && <p className="text-[#f85149] text-xs">{pwError}</p>}
          {pwSuccess && <p className="text-accent text-xs">Password updated successfully!</p>}
          <button
            type="submit"
            disabled={pwLoading}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {pwLoading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* 2FA management */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#cdd9e5]">Two-Factor Authentication</h2>
            <p className="text-xs text-[#8b949e] mt-0.5">Use an authenticator app (Google Authenticator, Authy, etc.) to generate one-time codes.</p>
          </div>
          <span className={`badge ${twoFAEnabled ? 'badge-green' : 'badge-gray'} text-xs shrink-0`}>
            {twoFAEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {/* Not enabled — show setup flow */}
        {!twoFAEnabled && !setupData && (
          <button
            onClick={handleSetup}
            disabled={setupLoading}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {setupLoading ? 'Generating…' : 'Enable 2FA'}
          </button>
        )}

        {/* Setup step: show QR + secret + verification input */}
        {!twoFAEnabled && setupData && (
          <div className="space-y-4">
            <p className="text-sm text-[#cdd9e5]">Scan the QR code with your authenticator app, then enter the 6-digit code to confirm.</p>
            <div className="flex justify-center">
              <img src={setupData.qr} alt="2FA QR code" className="w-48 h-48 rounded-lg bg-white p-2" />
            </div>
            <div className="card p-3 bg-surface-3">
              <p className="text-xs text-[#8b949e] mb-1">Manual entry key</p>
              <p className="font-mono text-sm text-[#cdd9e5] break-all select-all">{setupData.secret}</p>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#8b949e]">Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
                className="input text-sm"
                placeholder="6-digit code from app"
                autoFocus
              />
            </div>
            {setupError && <p className="text-[#f85149] text-xs">{setupError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleEnable}
                disabled={setupLoading || setupCode.length !== 6}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {setupLoading ? 'Verifying…' : 'Confirm & Enable'}
              </button>
              <button
                onClick={() => { setSetupData(null); setSetupCode(''); setSetupError(null) }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Enabled — show disable flow */}
        {twoFAEnabled && !disabling && (
          <button onClick={() => setDisabling(true)} className="btn-secondary text-sm text-[#f85149] border-[#f85149]/30 hover:border-[#f85149]">
            Disable 2FA
          </button>
        )}

        {twoFAEnabled && disabling && (
          <div className="space-y-3">
            <p className="text-sm text-[#cdd9e5]">Enter your current authenticator code to disable two-factor authentication.</p>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#8b949e]">Authenticator code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                className="input text-sm"
                placeholder="6-digit code"
                autoFocus
              />
            </div>
            {disableError && <p className="text-[#f85149] text-xs">{disableError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleDisable}
                disabled={disableLoading || disableCode.length !== 6}
                className="btn-primary bg-[#f85149] border-[#f85149] text-sm disabled:opacity-50"
              >
                {disableLoading ? 'Disabling…' : 'Confirm Disable'}
              </button>
              <button onClick={() => { setDisabling(false); setDisableCode(''); setDisableError(null) }} className="btn-secondary text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function WebhooksTab({ webhooks, loading, qc }) {
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ webhookname: '', webhooktype: 'map', webhookurl: '', webhookenabled: true })
  const [formError, setFormError] = useState(null)

  const createMutation = useMutation({
    mutationFn: () => createWebhook({ ...form, webhookenabled: form.webhookenabled }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['userWebhooks'] })
      setCreating(false)
      setForm({ webhookname: '', webhooktype: 'map', webhookurl: '', webhookenabled: true })
      setFormError(null)
    },
    onError: (err) => setFormError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteWebhook(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['userWebhooks'] }),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, hook }) => updateWebhook(id, {
      webhookname: hook.webhookname,
      webhooktype: hook.webhooktype,
      webhookenabled: !hook.webhookenabled,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['userWebhooks'] }),
  })

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Existing webhooks */}
      {webhooks?.length > 0 ? (
        <div className="card divide-y divide-border">
          {webhooks.map((hook) => (
            <div key={hook.id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#cdd9e5] truncate">{hook.webhookname}</span>
                  <span className="badge badge-blue text-xs">{hook.webhooktype}</span>
                  {hook.webhookenabled
                    ? <span className="badge badge-green text-xs">enabled</span>
                    : <span className="badge badge-gray text-xs">disabled</span>
                  }
                </div>
                <p className="text-xs text-[#8b949e] mt-0.5 truncate">{hook.webhookurl}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleMutation.mutate({ id: hook.id, hook })}
                  disabled={toggleMutation.isPending}
                  className="btn-secondary text-xs px-2 py-1"
                  title={hook.webhookenabled ? 'Disable' : 'Enable'}
                >
                  {hook.webhookenabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => deleteMutation.mutate(hook.id)}
                  disabled={deleteMutation.isPending}
                  className="btn-danger text-xs px-2 py-1"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : !creating ? (
        <p className="text-[#8b949e] text-center py-10">No webhooks configured.</p>
      ) : null}

      {/* Create form */}
      {creating ? (
        <div className="card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[#cdd9e5]">New Webhook</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#8b949e]">Name</label>
              <input
                value={form.webhookname}
                onChange={(e) => setForm((f) => ({ ...f, webhookname: e.target.value }))}
                className="input text-sm"
                placeholder="My webhook"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#8b949e]">Type</label>
              <select
                value={form.webhooktype}
                onChange={(e) => setForm((f) => ({ ...f, webhooktype: e.target.value }))}
                className="select"
              >
                <option value="map">Map</option>
                <option value="mod">Mod</option>
                <option value="prefab">Prefab</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8b949e]">URL</label>
            <input
              value={form.webhookurl}
              onChange={(e) => setForm((f) => ({ ...f, webhookurl: e.target.value }))}
              className="input text-sm"
              placeholder="https://discord.com/api/webhooks/..."
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-[#cdd9e5] cursor-pointer">
            <input
              type="checkbox"
              checked={form.webhookenabled}
              onChange={(e) => setForm((f) => ({ ...f, webhookenabled: e.target.checked }))}
              className="w-4 h-4 accent-accent"
            />
            Enabled
          </label>
          {formError && (
            <p className="text-[#f85149] text-xs bg-[#f85149]/10 border border-[#f85149]/30 rounded-md px-3 py-2">{formError}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !form.webhookname || !form.webhookurl}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </button>
            <button onClick={() => { setCreating(false); setFormError(null) }} className="btn-secondary text-sm">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setCreating(true)} className="btn-secondary text-sm">
          + Add Webhook
        </button>
      )}
    </div>
  )
}
