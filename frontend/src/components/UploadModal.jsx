import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { uploadMap, uploadPrefab, uploadModWithProgress, uploadModChunked, addImages, getTags } from '../api'
import TagPicker, { MAP_TAGS, MOD_TAGS } from './TagPicker'
import { VersionPicker } from './TagPicker'
import FileInput from './FileInput'

function useTags() {
  const { data } = useQuery({ queryKey: ['tags'], queryFn: getTags, staleTime: 60_000 })
  return {
    mapTags: data?.map_tags ?? MAP_TAGS,
    modTags: data?.mod_tags ?? MOD_TAGS,
  }
}

const PREFAB_TAGS = ['Weapons', 'Building', 'Foliage', 'Spawn', 'Vehicles', 'Lettering', 'Fx', 'Art', 'Misc']

function FormField({ label, required, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[#cdd9e5]">
        {label} {required && <span className="text-[#f85149]">*</span>}
      </label>
      {children}
    </div>
  )
}

function ProgressBar({ value }) {
  return (
    <div className="w-full bg-surface-3 rounded-full h-2 overflow-hidden">
      <div
        className="bg-accent h-2 rounded-full transition-all duration-200"
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

function MapUpload({ onClose }) {
  const { mapTags } = useTags()
  const [tags, setTags] = useState(['Slayer'])
  const [desc, setDesc] = useState('')
  const [visible, setVisible] = useState(true)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const mapRef = useRef()
  const variantRef = useRef()
  const imagesRef = useRef()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!mapRef.current?.files[0]) return setStatus({ error: 'Please select a map file.' })
    if (!variantRef.current?.files[0]) return setStatus({ error: 'Please select a variant file.' })

    setLoading(true)
    setStatus(null)
    const fd = new FormData()
    fd.append('files', mapRef.current.files[0])
    fd.append('files', variantRef.current.files[0])
    fd.append('mapTags', tags.join(','))
    fd.append('mapUserDesc', desc)
    fd.append('mapVisibility', visible)
    for (const f of imagesRef.current?.files ?? []) fd.append('files', f)

    try {
      await uploadMap(fd)
      setStatus({ success: true })
      setTimeout(() => { onClose(); navigate('/maps/newest') }, 1500)
    } catch (err) {
      setStatus({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="Map File" required>
        <FileInput inputRef={mapRef} accept=".map" hint="sandbox.map" />
      </FormField>
      <FormField label="Variant File" required>
        <FileInput inputRef={variantRef} hint="variant file" />
      </FormField>
      <FormField label="Map Images">
        <FileInput inputRef={imagesRef} accept="image/*" multiple hint="Up to 5 images" />
      </FormField>
      <FormField label="Description" required>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          maxLength={1200}
          className="input resize-none"
          required
        />
      </FormField>
      <FormField label="Tags">
        <TagPicker tags={mapTags} selected={tags} onChange={setTags} />
      </FormField>
      <label className="flex items-center gap-2 text-sm text-[#cdd9e5] cursor-pointer">
        <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="w-4 h-4 accent-accent" />
        Visible publicly
      </label>
      {status?.error && <p className="text-[#f85149] text-sm bg-[#f85149]/10 border border-[#f85149]/30 rounded-md px-3 py-2">{status.error}</p>}
      {status?.success && <p className="text-accent text-sm bg-accent/10 border border-accent/30 rounded-md px-3 py-2">Uploaded successfully!</p>}
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
          {loading ? 'Uploading…' : 'Upload Map'}
        </button>
      </div>
    </form>
  )
}

function ModUpload({ onClose }) {
  const { modTags } = useTags()
  const [tags, setTags] = useState([])
  const [gameVersion, setGameVersion] = useState('')
  const [desc, setDesc] = useState('')
  const [visible, setVisible] = useState(true)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const modRef = useRef()
  const imagesRef = useRef()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!modRef.current?.files[0]) return setStatus({ error: 'Please select a .pak file.' })
    if (!gameVersion) return setStatus({ error: 'Please select a game version.' })

    setLoading(true)
    setStatus(null)
    setProgress(0)
    const fd = new FormData()
    fd.append('files', modRef.current.files[0])
    fd.append('modTags', tags.join(','))
    fd.append('modDescription', desc)
    fd.append('modGameVersion', gameVersion)
    fd.append('modVisibility', visible)
    for (const f of imagesRef.current?.files ?? []) fd.append('files', f)

    try {
      let response
      const modFile = modRef.current.files[0]
      const chunkThreshold = 10 * 1024 * 1024

      if (modFile.size > chunkThreshold) {
        response = await uploadModChunked(modFile, {
          modDescription: desc,
          modTags: tags.join(','),
          modGameVersion: gameVersion,
          modVisibility: visible,
        }, setProgress)

        if (imagesRef.current?.files?.length > 0 && response?.mod_id) {
          const imagesFormData = new FormData()
          for (const f of imagesRef.current.files) imagesFormData.append('files', f)
          await addImages('mods', response.mod_id, imagesFormData)
        }
      } else {
        await uploadModWithProgress(fd, setProgress)
      }

      setStatus({ success: true })
      setTimeout(() => { onClose(); navigate('/mods/newest') }, 1500)
    } catch (err) {
      setStatus({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="Mod File" required>
        <FileInput inputRef={modRef} accept=".pak" hint=".pak files only" />
      </FormField>
      <FormField label="Mod Images">
        <FileInput inputRef={imagesRef} accept="image/*" multiple hint="Up to 5 images" />
      </FormField>
      <FormField label="Description" required>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          maxLength={1200}
          className="input resize-none"
          required
        />
      </FormField>
      <FormField label="Game Version" required>
        <VersionPicker value={gameVersion} onChange={setGameVersion} />
      </FormField>
      <FormField label="Tags">
        <TagPicker tags={modTags} selected={tags} onChange={setTags} />
      </FormField>
      <label className="flex items-center gap-2 text-sm text-[#cdd9e5] cursor-pointer">
        <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="w-4 h-4 accent-accent" />
        Visible publicly
      </label>
      {loading && <ProgressBar value={progress} />}
      {status?.error && <p className="text-[#f85149] text-sm bg-[#f85149]/10 border border-[#f85149]/30 rounded-md px-3 py-2">{status.error}</p>}
      {status?.success && <p className="text-accent text-sm bg-accent/10 border border-accent/30 rounded-md px-3 py-2">Uploaded successfully!</p>}
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
          {loading ? `Uploading… ${progress}%` : 'Upload Mod'}
        </button>
      </div>
    </form>
  )
}

function PrefabUpload({ onClose }) {
  const [tag, setTag] = useState('Misc')
  const [desc, setDesc] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const prefabRef = useRef()
  const imagesRef = useRef()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!prefabRef.current?.files[0]) return setStatus({ error: 'Please select a prefab file.' })

    setLoading(true)
    setStatus(null)
    const fd = new FormData()
    fd.append('files', prefabRef.current.files[0])
    fd.append('prefabTags', tag)
    fd.append('prefabDesc', desc)
    for (const f of imagesRef.current?.files ?? []) fd.append('files', f)

    try {
      await uploadPrefab(fd)
      setStatus({ success: true })
      setTimeout(() => { onClose(); navigate('/prefabs/newest') }, 1500)
    } catch (err) {
      setStatus({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="Prefab File" required>
        <FileInput inputRef={prefabRef} accept=".prefab,.zip" hint=".prefab or .zip" />
      </FormField>
      <FormField label="Prefab Images">
        <FileInput inputRef={imagesRef} accept="image/*" multiple hint="Up to 5 images" />
      </FormField>
      <FormField label="Description">
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          maxLength={1200}
          className="input resize-none"
        />
      </FormField>
      <FormField label="Tag">
        <select value={tag} onChange={(e) => setTag(e.target.value)} className="select w-full">
          {PREFAB_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </FormField>
      {status?.error && <p className="text-[#f85149] text-sm bg-[#f85149]/10 border border-[#f85149]/30 rounded-md px-3 py-2">{status.error}</p>}
      {status?.success && <p className="text-accent text-sm bg-accent/10 border border-accent/30 rounded-md px-3 py-2">Uploaded successfully!</p>}
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
          {loading ? 'Uploading…' : 'Upload Prefab'}
        </button>
      </div>
    </form>
  )
}

const TITLES = { map: 'Upload Map', mod: 'Upload Mod', prefab: 'Upload Prefab' }

export default function UploadModal({ type, onClose }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-[#e6edf3]">{TITLES[type]}</h2>
          <button onClick={onClose} className="text-[#8b949e] hover:text-[#cdd9e5] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          {type === 'map' && <MapUpload onClose={onClose} />}
          {type === 'mod' && <ModUpload onClose={onClose} />}
          {type === 'prefab' && <PrefabUpload onClose={onClose} />}
        </div>
      </div>
    </div>
  )
}
