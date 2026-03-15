import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getVariants, getVariantsNewest, getVariantsOldest, searchVariants } from '../api'
import { VariantCard, CardGrid, SkeletonCard, ErrorMessage, EmptyState } from '../components/ContentCard'
import Pagination from '../components/Pagination'

const PAGE_SIZE = 21
const VARIANT_TYPES = ['All', 'Slayer', 'Oddball', 'KOTH', 'CTF', 'Assault', 'Territories', 'Juggernaut', 'Infection', 'VIP']
const SORT_OPTIONS = [
  { label: 'Default', value: '' },
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
]

export default function VariantsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const query = searchParams.get('q') || ''
  const typeFilter = searchParams.get('type') || 'All'
  const sort = searchParams.get('sort') || ''

  useEffect(() => { setPage(1) }, [query, typeFilter, sort])

  function fetchFn() {
    if (query) return searchVariants(query, page, PAGE_SIZE)
    if (typeFilter && typeFilter !== 'All') return searchVariants(typeFilter, page, PAGE_SIZE)
    if (sort === 'newest') return getVariantsNewest(page, PAGE_SIZE)
    if (sort === 'oldest') return getVariantsOldest(page, PAGE_SIZE)
    return getVariants(page, PAGE_SIZE)
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['variants', query, typeFilter, sort, page],
    queryFn: fetchFn,
    keepPreviousData: true,
  })

  const variants = data?.items ?? []
  const total = data?.total ?? 0

  function setParam(key, value) {
    const p = new URLSearchParams(searchParams)
    if (!value || value === 'All') p.delete(key)
    else p.set(key, value)
    if (key !== 'q') p.delete('q')
    setSearchParams(p)
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-[#e6edf3]">
            {query ? `Search: "${query}"` : 'Game Variants'}
          </h1>
          {!query && total > 0 && <p className="text-sm text-[#8b949e] mt-0.5">{total} variants</p>}
        </div>
        {query && (
          <button onClick={() => setParam('q', '')} className="btn-secondary text-sm">
            ✕ Clear search
          </button>
        )}
      </div>

      {!query && (
        <div className="space-y-2 mb-6">
          {/* Sort filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-[#8b949e] w-14 shrink-0">Sort</span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setParam('sort', opt.value)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  sort === opt.value
                    ? 'bg-accent text-white'
                    : 'text-[#8b949e] hover:text-[#cdd9e5] hover:bg-surface-3'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-[#8b949e] w-14 shrink-0">Type</span>
            {VARIANT_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setParam('type', t)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  typeFilter === t || (t === 'All' && typeFilter === 'All')
                    ? 'bg-accent text-white'
                    : 'text-[#8b949e] hover:text-[#cdd9e5] hover:bg-surface-3'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {isError && <ErrorMessage message="Failed to load variants." />}

      {isLoading ? (
        <CardGrid>{Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}</CardGrid>
      ) : variants.length === 0 ? (
        <EmptyState message="No variants found." />
      ) : (
        <>
          <CardGrid>{variants.map((v) => <VariantCard key={v.id} variant={v} />)}</CardGrid>
          <Pagination page={page} total={total} size={PAGE_SIZE} onChange={(p) => { setPage(p); window.scrollTo(0, 0) }} />
        </>
      )}
    </div>
  )
}
