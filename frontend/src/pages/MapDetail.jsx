import { useState, useRef } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMap, getUser, getVotes, castVote, timeSince, updateMap, getMapChangelog, updateMapFile, deleteMap, getTags } from '../api'
import { useAuthStore } from '../store/auth'
import { ErrorMessage } from '../components/ContentCard'
import ImageManager from '../components/ImageManager'
import SimilarItems from '../components/SimilarItems'
import TagPicker, { MAP_TAGS } from '../components/TagPicker'
import FileInput from '../components/FileInput'

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

function VoteButtons({ mapId }) {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const { data: votes } = useQuery({
    queryKey: ['votes', mapId],
    queryFn: () => getVotes(mapId),
  })

  const mutation = useMutation({
    mutationFn: (vote) => castVote(mapId, vote),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['votes', mapId] }),
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

function ImageCarousel({ mapId, count = 5, cacheKey = 0 }) {
  const [current, setCurrent] = useState(0)
  const images = Array.from({ length: count }, (_, i) => `/maps/${mapId}/${i}${cacheKey ? `?t=${cacheKey}` : ''}`)

  return (
    <div className="relative bg-surface-3 rounded-lg overflow-hidden">
      <img
        src={images[current]}
        alt={`Map image ${current + 1}`}
        className="w-full object-cover"
        style={{ maxHeight: '480px', minHeight: '240px' }}
        onError={(e) => { e.target.src = DEFAULT_IMG }}
      />
      {count > 1 && (
        <>
          <button
            onClick={() => setCurrent((c) => (c - 1 + count) % count)}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors"
          >‹</button>
          <button
            onClick={() => setCurrent((c) => (c + 1) % count)}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors"
          >›</button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === current ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function MapDetail({ legacyQuery }) {
  const params = useParams()
  const [searchParams] = useSearchParams()
  const mapId = legacyQuery ? searchParams.get(legacyQuery) : params.id
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
  const mapFileRef = useRef(null)
  const variantFileRef = useRef(null)
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data: map, isLoading, isError } = useQuery({
    queryKey: ['map', mapId],
    queryFn: () => getMap(mapId),
    enabled: !!mapId,
  })

  const { data: uploader } = useQuery({
    queryKey: ['user', map?.owner_id],
    queryFn: () => getUser(map.owner_id),
    enabled: !!map?.owner_id,
  })

  const { data: tagsData } = useQuery({ queryKey: ['tags'], queryFn: getTags, staleTime: 60_000 })
  const availableMapTags = tagsData?.map_tags ?? MAP_TAGS

  const editMutation = useMutation({
    mutationFn: (data) => updateMap(mapId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['map', mapId] })
      setEditing(false)
    },
  })

  function startEditing() {
    setEditForm({
      mapName: map.mapName,
      mapUserDesc: map.mapUserDesc || '',
      mapTags: map.mapTags ? map.mapTags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      visible: !map.notVisible,
    })
    setEditing(true)
  }

  function saveEdit() {
    editMutation.mutate({
      mapName: editForm.mapName,
      mapUserDesc: editForm.mapUserDesc,
      mapTags: editForm.mapTags.join(','),
      mapVisibility: editForm.visible,
    })
  }

  const { data: changelog } = useQuery({
    queryKey: ['map-changelog', mapId],
    queryFn: () => getMapChangelog(mapId),
    enabled: tab === 'changelog',
  })

  async function handleFileUpdate() {
    if (!mapFileRef.current?.files[0]) return setUpdateStatus({ error: 'Please select a map file.' })
    if (!variantFileRef.current?.files[0]) return setUpdateStatus({ error: 'Please select a variant file.' })
    if (!updateChangelog.trim()) return setUpdateStatus({ error: 'Please enter a changelog entry.' })
    setUpdateLoading(true)
    setUpdateStatus(null)
    setUpdateProgress(0)
    const fd = new FormData()
    fd.append('files', mapFileRef.current.files[0])
    fd.append('files', variantFileRef.current.files[0])
    fd.append('changelog', updateChangelog)
    try {
      await updateMapFile(mapId, fd, setUpdateProgress)
      setUpdateStatus({ success: true })
      qc.invalidateQueries({ queryKey: ['map', mapId] })
      qc.invalidateQueries({ queryKey: ['map-changelog', mapId] })
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
      await deleteMap(mapId)
      navigate('/maps')
    } catch (err) {
      setDeleteError(err.message)
      setDeleteLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="skeleton rounded-xl" style={{ height: '380px' }} />
        <div className="skeleton h-8 w-1/2" />
        <div className="skeleton h-4 w-full" />
      </div>
    )
  }

  if (isError || !map) return <ErrorMessage message="Map not found." />

  const heroImg = `/maps/${mapId}/0${cacheKey ? `?t=${cacheKey}` : ''}`
  const description = map.mapUserDesc?.trim() || map.mapDescription

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-6">
      <div>{/* main column */}
      {/* Hero banner */}
      <div className="relative rounded-xl overflow-hidden mb-0" style={{ minHeight: '360px' }}>
        <img
          src={heroImg}
          alt={map.mapName}
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
              {map.mapTags && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {map.mapTags.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                    <span key={t} className="badge badge-green text-xs">{t}</span>
                  ))}
                </div>
              )}
              <h1 className="text-3xl font-bold text-white leading-tight">{map.mapName}</h1>
              <p className="text-[#8b949e] mt-1 text-sm">
                by {map.mapAuthor}
                {uploader && (
                  <> · uploaded by <Link to={`/u/${uploader.name}`} className="text-link hover:text-link-hover">{uploader.name}</Link></>
                )}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-[#8b949e]">
                {map.map_downloads != null && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {map.map_downloads.toLocaleString()} downloads
                  </span>
                )}
                {map.time_created && (
                  <span>{timeSince(map.time_created)} ago</span>
                )}
                {map.gameVersion && (
                  <span>v{map.gameVersion}</span>
                )}
              </div>
            </div>
            <VoteButtons mapId={mapId} />
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
            {/* Download buttons + edit */}
            <div className="flex flex-wrap gap-2">
              <a href={`/api_v2/maps/${mapId}/file`} className="btn-primary no-underline" download>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Map File
              </a>
              <a href={`/api_v2/maps/${mapId}/variant/file`} className="btn-secondary no-underline" download>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Variant File
              </a>
              {(user?.id === map.owner_id || user?.is_admin) && !editing && !updatingFile && !confirmDelete && (
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
                <h3 className="text-sm font-semibold text-[#cdd9e5]">Update Map Files</h3>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[#8b949e]">Map File <span className="text-[#f85149]">*</span></label>
                  <FileInput inputRef={mapFileRef} accept=".map" hint="sandbox.map" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[#8b949e]">Variant File <span className="text-[#f85149]">*</span></label>
                  <FileInput inputRef={variantFileRef} hint="variant file" />
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
                <h3 className="text-sm font-semibold text-[#f85149]">Delete Map</h3>
                <p className="text-sm text-[#cdd9e5]">Are you sure you want to delete <strong>{map.mapName}</strong>? This action cannot be undone.</p>
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
                <h3 className="text-sm font-semibold text-[#cdd9e5]">Edit Map</h3>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#8b949e]">Name</label>
                  <input
                    value={editForm.mapName}
                    onChange={(e) => setEditForm((f) => ({ ...f, mapName: e.target.value }))}
                    className="input text-sm"
                    maxLength={100}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#8b949e]">Description</label>
                  <textarea
                    value={editForm.mapUserDesc}
                    onChange={(e) => setEditForm((f) => ({ ...f, mapUserDesc: e.target.value }))}
                    rows={4}
                    className="input resize-none text-sm"
                    maxLength={1200}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[#8b949e]">Tags</label>
                  <TagPicker tags={availableMapTags} selected={editForm.mapTags} onChange={(t) => setEditForm((f) => ({ ...f, mapTags: t }))} />
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
                    disabled={editMutation.isPending || !editForm.mapName}
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
                ['Author', map.mapAuthor],
                ['Game Description', map.mapDescription],
                ['ElDewrito Version', map.gameVersion],
                ['Total Objects', map.mapTotalObject],
                ['Scenario Objects', map.mapScnrObjectCount],
                ['Budget Count', map.mapBudgetCount],
                ['Downloads', map.map_downloads],
                ['Tag', formatTagList(map.mapTags)],
                ['Uploaded', map.time_created ? `${timeSince(map.time_created)} ago` : '—'],
                ['ID', map.id],
              ].map(([label, value]) => value != null && (
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
            <ImageCarousel mapId={mapId} cacheKey={cacheKey} />
            <ImageManager type="maps" itemId={mapId} ownerId={map.owner_id} onUpdate={setCacheKey} />
          </div>
        )}

        {tab === 'changelog' && (
          <ChangelogTab entries={changelog} />
        )}
      </div>
      </div>{/* end main column */}

      {/* Similar maps sidebar */}
      <aside className="hidden lg:block">
        <SimilarItems type="maps" tag={map.mapTags} currentId={mapId} />
      </aside>
      </div>{/* end grid */}
    </div>
  )
}
