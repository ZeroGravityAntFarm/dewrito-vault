import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getVariant, getUser, timeSince } from '../api'
import { ErrorMessage } from '../components/ContentCard'

export default function VariantDetail({ legacyQuery }) {
  const params = useParams()
  const [searchParams] = useSearchParams()
  const variantId = legacyQuery ? searchParams.get(legacyQuery) : params.id

  // If the id is not numeric (e.g. a type name from old route), redirect to variants page
  if (variantId && isNaN(Number(variantId))) {
    return (
      <div className="text-center py-20 text-[#8b949e]">
        Invalid variant ID. <Link to="/variants">View all variants</Link>
      </div>
    )
  }

  const { data: variant, isLoading, isError } = useQuery({
    queryKey: ['variant', variantId],
    queryFn: () => getVariant(variantId),
    enabled: !!variantId,
  })

  const { data: uploader } = useQuery({
    queryKey: ['user', variant?.owner_id],
    queryFn: () => getUser(variant.owner_id),
    enabled: !!variant?.owner_id,
  })

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="skeleton h-8 w-1/2" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-3/4" />
      </div>
    )
  }

  if (isError || !variant) return <ErrorMessage message="Variant not found." />

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-[#e6edf3]">{variant.variantName}</h1>
          <span className="badge badge-blue">{variant.variantType}</span>
        </div>
        <p className="text-[#8b949e]">
          by {variant.variantAuthor}
          {uploader && <> · uploaded by <Link to={`/u/${uploader.name}`}>{uploader.name}</Link></>}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a href={`/api_v2/variants/${variantId}/file`} className="btn-primary no-underline" download>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Variant
        </a>
      </div>

      {variant.variantDescription && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider mb-3">Description</h2>
          <p className="text-[#cdd9e5] text-sm leading-relaxed whitespace-pre-wrap">{variant.variantDescription}</p>
        </div>
      )}

      <div className="card divide-y divide-border">
        <h2 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider px-5 py-3">Details</h2>
        {[
          ['Type', variant.variantType],
          ['Author', variant.variantAuthor],
          ['Downloads', variant.downloads],
          ['Filename', variant.variantFileName],
          ['Uploaded', variant.time_created ? `${timeSince(variant.time_created)} ago` : '—'],
          ['ID', variant.id],
        ].filter(([, v]) => v != null).map(([label, value]) => (
          <div key={label} className="flex items-start gap-4 px-5 py-3">
            <span className="text-[#8b949e] text-sm w-36 shrink-0">{label}</span>
            <span className="text-[#cdd9e5] text-sm">{String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
