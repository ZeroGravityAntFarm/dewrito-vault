import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { searchMaps, searchMods } from '../api'
import { MapCard, ModCard, CardGrid, SkeletonCard, EmptyState } from '../components/ContentCard'

const PAGE_SIZE = 12

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''

  const { data: mapData, isLoading: mapsLoading } = useQuery({
    queryKey: ['search-maps', query],
    queryFn: () => searchMaps(query, 1, PAGE_SIZE),
    enabled: !!query,
  })

  const { data: modData, isLoading: modsLoading } = useQuery({
    queryKey: ['search-mods', query],
    queryFn: () => searchMods(query, 1, PAGE_SIZE),
    enabled: !!query,
  })

  const maps = mapData?.items ?? []
  const mods = modData?.items ?? []
  const isLoading = mapsLoading || modsLoading
  const noResults = !isLoading && maps.length === 0 && mods.length === 0

  if (!query) {
    return (
      <div className="text-center py-12 text-[#8b949e]">
        Enter a search term to find maps and mods.
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[#e6edf3] mb-6">
        Search: "{query}"
      </h1>

      {noResults && <EmptyState message={`No results found for "${query}"`} />}

      {/* Maps section */}
      {(mapsLoading || maps.length > 0) && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[#cdd9e5] mb-3">
            Maps {!mapsLoading && `(${mapData?.total ?? maps.length})`}
          </h2>
          {mapsLoading ? (
            <CardGrid>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </CardGrid>
          ) : (
            <CardGrid>
              {maps.map((m) => <MapCard key={m.id} map={m} />)}
            </CardGrid>
          )}
        </section>
      )}

      {/* Mods section */}
      {(modsLoading || mods.length > 0) && (
        <section>
          <h2 className="text-lg font-semibold text-[#cdd9e5] mb-3">
            Mods {!modsLoading && `(${modData?.total ?? mods.length})`}
          </h2>
          {modsLoading ? (
            <CardGrid>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </CardGrid>
          ) : (
            <CardGrid>
              {mods.map((m) => <ModCard key={m.id} mod={m} />)}
            </CardGrid>
          )}
        </section>
      )}
    </div>
  )
}
