import { useState, useRef } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMod, getUser, getModVotes, castModVote, timeSince, updateMod, getModChangelog, updateModFile, deleteMod, getTags } from '../api'
import { useAuthStore } from '../store/auth'
import { ErrorMessage } from '../components/ContentCard'
import ImageManager from '../components/ImageManager'
import SimilarItems from '../components/SimilarItems'
import TagPicker, { MOD_TAGS } from '../components/TagPicker'
import { VersionPicker } from '../components/TagPicker'
import FileInput from '../components/FileInput'
import React, { useEffect } from 'react'

const DEFAULT_IMG = '/content/default/forge.jpg'

function formatTagList(tags) {
  if (!tags) return ''
  return tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .join(', ')
}

function ChangelogTab({ entries }) {
  if (!entries) return <div className="skeleton h-24 rounded-lg" />
  if (!entries.length) return (
    <div className="card p-8 text-center">
      <svg className="w-10 h-10 text-[#8b949e] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p className="text-[#8b949e] text-sm">No changelog entries yet.</p>
    </div>
  )
  return (
    <div className="card divide-y divide-border">
      {entries.map((e) => (
        <div key={e.id} className="px-5 py-4 space-y-1">
          <div className="flex items-center gap-2">
            <span className="badge badge-blue text-xs">v{e.version}</span>
            <span className="text-xs text-[#8b949e]">{new Date(e.time_created).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
          <p className="text-sm text-[#cdd9e5] leading-relaxed whitespace-pre-wrap">{e.entry}</p>
        </div>
      ))}
    </div>
  )
}

function VoteButtons({ modId }) {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const { data: votes } = useQuery({
    queryKey: ['mod-votes', modId],
    queryFn: () => getModVotes(modId),
  })

  const mutation = useMutation({
    mutationFn: (vote) => castModVote(modId, vote),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mod-votes', modId] }),
  })

  const loginTitle = 'Log in to vote'

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => user && mutation.mutate(1)}
        disabled={!user || mutation.isPending}
        className="btn-secondary gap-1.5"
        title={user ? 'Upvote' : loginTitle}
      >
        <span style={{ filter: 'grayscale(1)' }}>👍</span>
        <span className="text-accent font-medium">{votes?.up_votes ?? 0}</span>
      </button>
      <button
        onClick={() => user && mutation.mutate(0)}
        disabled={!user || mutation.isPending}
        className="btn-secondary gap-1.5"
        title={user ? 'Downvote' : loginTitle}
      >
        <span style={{ filter: 'grayscale(1)' }}>👎</span>
        <span className="text-[#f85149] font-medium">{votes?.down_votes ?? 0}</span>
      </button>
    </div>
  )
}

function ImageCarousel({ modId, count = 5, cacheKey = 0 }) {
  const [current, setCurrent] = useState(0)
  const images = Array.from({ length: count }, (_, i) => `/mods/${modId}/${i}${cacheKey ? `?t=${cacheKey}` : ''}`)

  return (
    <div className="relative bg-surface-3 rounded-lg overflow-hidden">
      <img
        src={images[current]}
        alt={`Mod image ${current + 1}`}
        className="w-full object-cover"
        style={{ maxHeight: '480px', minHeight: '240px' }}
        onError={(e) => { e.target.src = DEFAULT_IMG }}
      />
      {count > 1 && (
        <>
          <button onClick={() => setCurrent((c) => (c - 1 + count) % count)} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors">‹</button>
          <button onClick={() => setCurrent((c) => (c + 1) % count)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors">›</button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} className={`w-2 h-2 rounded-full transition-colors ${i === current ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function ModDetail({ legacyQuery }) {
  const params = useParams()
  const [searchParams] = useSearchParams()
  const modId = legacyQuery ? searchParams.get(legacyQuery) : params.id
  const [cacheKey, setCacheKey] = useState(0)
  const [tab, setTab] = useState('overview')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [updatingFile, setUpdatingFile] = useState(false)
  const [updateChangelog, setUpdateChangelog] = useState('')
  const [updateProgress, setUpdateProgress] = useState(0)
  const [updateStatus, setUpdateStatus] = useState(null)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const modFileRef = useRef(null)
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data: mod, isLoading, isError } = useQuery({
    queryKey: ['mod', modId],
    queryFn: () => getMod(modId),
    enabled: !!modId,
  })

  const { data: uploader } = useQuery({
    queryKey: ['user', mod?.owner_id],
    queryFn: () => getUser(mod.owner_id),
    enabled: !!mod?.owner_id,
  })

  const { data: tagsData } = useQuery({ queryKey: ['tags'], queryFn: getTags, staleTime: 60_000 })
  const availableModTags = tagsData?.mod_tags ?? MOD_TAGS

  const editMutation = useMutation({
    mutationFn: (data) => updateMod(modId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mod', modId] })
      setEditing(false)
    },
  })

  function startEditing() {
    setEditForm({
      modName: mod.modName,
      modUserDesc: mod.modUserDescription || mod.modDescription || '',
      modTags: mod.modTags ? mod.modTags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      gameVersion: mod.gameVersion || '',
      visible: !mod.notVisible,
    })
    setEditing(true)
  }

  function saveEdit() {
    editMutation.mutate({
      modName: editForm.modName,
      modUserDesc: editForm.modUserDesc,
      modTags: editForm.modTags.join(','),
      modVisibility: editForm.visible,
      gameVersion: editForm.gameVersion,
    })
  }

  const { data: changelog } = useQuery({
    queryKey: ['mod-changelog', modId],
    queryFn: () => getModChangelog(modId),
    enabled: tab === 'changelog',
  })

  async function handleFileUpdate() {
    if (!modFileRef.current?.files[0]) return setUpdateStatus({ error: 'Please select a .pak file.' })
    if (!updateChangelog.trim()) return setUpdateStatus({ error: 'Please enter a changelog entry.' })
    setUpdateLoading(true)
    setUpdateStatus(null)
    setUpdateProgress(0)
    const fd = new FormData()
    fd.append('files', modFileRef.current.files[0])
    fd.append('changelog', updateChangelog)
    try {
      await updateModFile(modId, fd, setUpdateProgress)
      setUpdateStatus({ success: true })
      qc.invalidateQueries({ queryKey: ['mod', modId] })
      qc.invalidateQueries({ queryKey: ['mod-changelog', modId] })
      setTimeout(() => { setUpdatingFile(false); setUpdateChangelog(''); setUpdateStatus(null) }, 1500)
    } catch (err) {
      setUpdateStatus({ error: err.message })
    } finally {
      setUpdateLoading(false)
    }
  }

  async function handleDelete() {
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      await deleteMod(modId)
      navigate('/mods')
    } catch (err) {
      setDeleteError(err.message)
      setDeleteLoading(false)
    }
  }

  useEffect(() => {
    if (mod?.modName) {
      document.title = `${mod.modName} - Dewrito Share`;
    }
    return () => {
      document.title = 'Dewrito Share';
    };
  }, [mod?.modName]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="skeleton rounded-xl" style={{ height: '380px' }} />
        <div className="skeleton h-8 w-1/2" />
        <div className="skeleton h-4 w-full" />
      </div>
    )
  }

  if (isError || !mod) return <ErrorMessage message="Mod not found." />

  const heroImg = `/mods/${modId}/0${cacheKey ? `?t=${cacheKey}` : ''}`
  const description = mod.modUserDescription?.trim() || mod.modDescription

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-6">
      <div>{/* main column */}
      {/* Hero banner */}
      <div className="relative rounded-xl overflow-hidden mb-0" style={{ minHeight: '360px' }}>
        <img
          src={heroImg}
          alt={mod.modName}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { e.target.src = DEFAULT_IMG }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(13,17,23,0.1) 20%, rgba(13,17,23,0.75) 65%, #0d1117 100%)' }}
        />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              {mod.modTags && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {mod.modTags.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                    <span key={t} className="badge badge-blue text-xs">{t}</span>
                  ))}
                </div>
              )}
              <h1 className="text-3xl font-bold text-white leading-tight">{mod.modName}</h1>
              <p className="text-[#8b949e] mt-1 text-sm">
                Author {mod.modAuthor}
                {uploader && (
                  <> · Uploader <Link to={`/u/${uploader.name}`} className="text-link hover:text-link-hover">{uploader.name}</Link></>
                )}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-[#8b949e]">
                {mod.mod_downloads != null && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {mod.mod_downloads.toLocaleString()} downloads
                  </span>
                )}
                {mod.time_created && (
                  <span>{timeSince(mod.time_created)} ago</span>
                )}
                {mod.modVersion && (
                  <span>v{mod.modVersion}</span>
                )}
                {mod.modFileSize && (
                  <span>{(mod.modFileSize / 1024 / 1024).toFixed(2)} MB</span>
                )}
              </div>
            </div>
            <VoteButtons modId={modId} />
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-border flex gap-1 mb-6" style={{ background: '#0d1117' }}>
        {['overview', 'gallery', 'changelog'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`tab-btn capitalize ${tab === t ? 'active' : ''}`}
          >
            {t === 'overview' ? 'Overview' : t === 'gallery' ? 'Gallery' : 'Changelog'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="max-w-4xl">
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Download + edit */}
            <div className="flex flex-wrap gap-2">
              <a href={`/api_v2/mods/${modId}/file`} className="btn-primary no-underline" download>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download .pak
              </a>
              {(user?.id === mod.owner_id || user?.is_admin) && !editing && !updatingFile && !confirmDelete && (
                <>
                  <button onClick={startEditing} className="btn-secondary">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button onClick={() => setUpdatingFile(true)} className="btn-secondary">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Update File
                  </button>
                  <button onClick={() => setConfirmDelete(true)} className="btn-secondary text-[#f85149] border-[#f85149]/30 hover:border-[#f85149]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </>
              )}
            </div>

            {/* Update file form */}
            {updatingFile && (
              <div className="card p-5 space-y-4">
                <h3 className="text-sm font-semibold text-[#cdd9e5]">Update Mod File</h3>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[#8b949e]">Mod File (.pak) <span className="text-[#f85149]">*</span></label>
                  <FileInput inputRef={modFileRef} accept=".pak" hint=".pak files only" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#8b949e]">Changelog Entry <span className="text-[#f85149]">*</span></label>
                  <textarea
                    value={updateChangelog}
                    onChange={(e) => setUpdateChangelog(e.target.value)}
                    rows={3}
                    className="input resize-none text-sm"
                    maxLength={2000}
                    placeholder="Describe what changed in this update…"
                  />
                </div>
                {updateLoading && (
                  <div className="w-full bg-surface-3 rounded-full h-2 overflow-hidden">
                    <div className="bg-accent h-2 rounded-full transition-all duration-200" style={{ width: `${updateProgress}%` }} />
                  </div>
                )}
                {updateStatus?.error && <p className="text-[#f85149] text-xs">{updateStatus.error}</p>}
                {updateStatus?.success && <p className="text-accent text-xs">Updated successfully!</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleFileUpdate}
                    disabled={updateLoading}
                    className="btn-primary text-sm disabled:opacity-50"
                  >
                    {updateLoading ? `Uploading… ${updateProgress}%` : 'Upload Update'}
                  </button>
                  <button onClick={() => { setUpdatingFile(false); setUpdateStatus(null) }} className="btn-secondary text-sm">Cancel</button>
                </div>
              </div>
            )}

            {/* Delete confirmation */}
            {confirmDelete && (
              <div className="card p-5 space-y-3 border border-[#f85149]/30">
                <h3 className="text-sm font-semibold text-[#f85149]">Delete Mod</h3>
                <p className="text-sm text-[#cdd9e5]">Are you sure you want to delete <strong>{mod.modName}</strong>? This action cannot be undone.</p>
                {deleteError && <p className="text-[#f85149] text-xs">{deleteError}</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="btn-primary bg-[#f85149] border-[#f85149] hover:bg-[#f85149]/80 text-sm disabled:opacity-50"
                  >
                    {deleteLoading ? 'Deleting…' : 'Confirm Delete'}
                  </button>
                  <button onClick={() => { setConfirmDelete(false); setDeleteError(null) }} className="btn-secondary text-sm">Cancel</button>
                </div>
              </div>
            )}

            {/* Edit form */}
            {editing && editForm && (
              <div className="card p-5 space-y-4">
                <h3 className="text-sm font-semibold text-[#cdd9e5]">Edit Mod</h3>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#8b949e]">Name</label>
                  <input
                    value={editForm.modName}
                    onChange={(e) => setEditForm((f) => ({ ...f, modName: e.target.value }))}
                    className="input text-sm"
                    maxLength={100}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#8b949e]">Description</label>
                  <textarea
                    value={editForm.modUserDesc}
                    onChange={(e) => setEditForm((f) => ({ ...f, modUserDesc: e.target.value }))}
                    rows={4}
                    className="input resize-none text-sm"
                    maxLength={1200}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[#8b949e]">Tags</label>
                  <TagPicker tags={availableModTags} selected={editForm.modTags} onChange={(t) => setEditForm((f) => ({ ...f, modTags: t }))} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#8b949e]">Game Version</label>
                  <VersionPicker
                    value={editForm.gameVersion}
                    onChange={(v) => setEditForm((f) => ({ ...f, gameVersion: v }))}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-[#cdd9e5] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.visible}
                    onChange={(e) => setEditForm((f) => ({ ...f, visible: e.target.checked }))}
                    className="w-4 h-4 accent-accent"
                  />
                  Visible publicly
                </label>
                {editMutation.isError && (
                  <p className="text-[#f85149] text-xs">{editMutation.error?.message}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={saveEdit}
                    disabled={editMutation.isPending || !editForm.modName}
                    className="btn-primary text-sm disabled:opacity-50"
                  >
                    {editMutation.isPending ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditing(false)} className="btn-secondary text-sm">Cancel</button>
                </div>
              </div>
            )}

            {/* Description */}
            {description && !editing && (
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider mb-3">Description</h2>
                <div className="prose-description">
                  <ReactMarkdown>{description}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="card divide-y divide-border">
              <h2 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider px-5 py-3">Details</h2>
              {[
                ['Author', mod.modAuthor],
                ['Version', mod.modVersion],
                ['ElDewrito Version', mod.gameVersion],
                ['File Size', mod.modFileSize ? `${(mod.modFileSize / 1024 / 1024).toFixed(2)} MB` : null],
                ['Downloads', mod.mod_downloads],
                ['Tag', formatTagList(mod.modTags)],
                ['Uploaded', mod.time_created ? `${timeSince(mod.time_created)} ago` : '—'],
                ['ID', mod.id],
              ].filter(([, v]) => v != null).map(([label, value]) => (
                <div key={label} className="flex items-start gap-4 px-5 py-3">
                  <span className="text-[#8b949e] text-sm w-40 shrink-0">{label}</span>
                  <span className="text-[#cdd9e5] text-sm">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'gallery' && (
          <div className="space-y-6">
            <ImageCarousel modId={modId} cacheKey={cacheKey} />
            <ImageManager type="mods" itemId={modId} ownerId={mod.owner_id} onUpdate={setCacheKey} />
          </div>
        )}

        {tab === 'changelog' && (
          <ChangelogTab entries={changelog} />
        )}
      </div>
      </div>{/* end main column */}

      {/* Similar mods sidebar */}
      <aside className="hidden lg:block">
        <SimilarItems type="mods" tag={mod.modTags} currentId={modId} />
      </aside>
      </div>{/* end grid */}
    </div>
  )
}
