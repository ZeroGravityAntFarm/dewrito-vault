import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getImageCount, addImages, deleteImage, reorderImages } from '../api'
import { useAuthStore } from '../store/auth'

export default function ImageManager({ type, itemId, ownerId, onUpdate }) {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const fileRef = useRef()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [cacheKey, setCacheKey] = useState(Date.now())

  const queryKey = ['imageCount', type, itemId]

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getImageCount(type, itemId),
    enabled: !!itemId,
  })

  const count = data?.count ?? 0

  const bump = () => {
    qc.invalidateQueries({ queryKey })
    const k = Date.now()
    setCacheKey(k)
    onUpdate?.(k)
  }

  const deleteMutation = useMutation({
    mutationFn: (index) => deleteImage(type, itemId, index),
    onSuccess: bump,
    onError: (err) => setError(err.message),
  })

  const reorderMutation = useMutation({
    mutationFn: (order) => reorderImages(type, itemId, order),
    onSuccess: bump,
    onError: (err) => setError(err.message),
  })

  if (!user || user.id !== ownerId) return null

  const isPending = deleteMutation.isPending || reorderMutation.isPending || uploading

  const handleSwap = (i, j) => {
    const order = Array.from({ length: count }, (_, k) => k)
    ;[order[i], order[j]] = [order[j], order[i]]
    reorderMutation.mutate(order)
  }

  const handleAddFiles = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setError(null)
    setUploading(true)
    const fd = new FormData()
    files.forEach((f) => fd.append('files', f))
    try {
      await addImages(type, itemId, fd)
      bump()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="card p-5 space-y-4">
      <h2 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider">Manage Images</h2>

      {isLoading ? (
        <div className="text-[#8b949e] text-sm">Loading...</div>
      ) : count === 0 ? (
        <p className="text-[#8b949e] text-sm">No images uploaded yet.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: count }, (_, i) => (
            <div key={`${i}-${cacheKey}`} className="relative group w-32">
              <img
                src={`/${type}/tb/${itemId}/${i}?t=${cacheKey}`}
                alt={`Image ${i + 1}`}
                className="w-32 h-20 object-cover rounded border border-border"
                onError={(e) => { e.target.style.opacity = '0.3' }}
              />
              <span className="absolute top-1 left-1 bg-black/70 text-white text-xs rounded px-1 leading-4">
                {i + 1}
              </span>
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-1">
                {i > 0 && (
                  <button
                    onClick={() => handleSwap(i, i - 1)}
                    disabled={isPending}
                    className="bg-surface-2 hover:bg-surface-3 text-[#e6edf3] rounded px-2 py-1 text-sm font-bold disabled:opacity-50"
                    title="Move left"
                  >
                    ←
                  </button>
                )}
                <button
                  onClick={() => { setError(null); deleteMutation.mutate(i) }}
                  disabled={isPending}
                  className="bg-red-900/80 hover:bg-red-700 text-white rounded px-2 py-1 text-sm font-bold disabled:opacity-50"
                  title="Delete"
                >
                  ✕
                </button>
                {i < count - 1 && (
                  <button
                    onClick={() => handleSwap(i, i + 1)}
                    disabled={isPending}
                    className="bg-surface-2 hover:bg-surface-3 text-[#e6edf3] rounded px-2 py-1 text-sm font-bold disabled:opacity-50"
                    title="Move right"
                  >
                    →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {count < 5 && (
        <div className="flex items-center gap-3">
          <label className={`btn-secondary cursor-pointer ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
            {uploading ? 'Uploading…' : `Add Images (${count}/5)`}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleAddFiles}
              disabled={isPending}
            />
          </label>
          <span className="text-[#8b949e] text-xs">
            {5 - count} slot{5 - count !== 1 ? 's' : ''} remaining
          </span>
        </div>
      )}

      {error && <p className="text-[#f85149] text-sm">{error}</p>}
    </div>
  )
}
