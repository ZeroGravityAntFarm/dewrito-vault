export default function Pagination({ page, total, size, onChange }) {
  const pages = Math.max(1, Math.ceil(total / size))
  if (pages <= 1) return null

  const delta = 2
  const left = page - delta
  const right = page + delta + 1
  const items = []

  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= left && i < right)) {
      items.push(i)
    }
  }

  // Insert ellipsis
  const withEllipsis = []
  let prev = null
  for (const i of items) {
    if (prev !== null && i - prev > 1) {
      withEllipsis.push('...')
    }
    withEllipsis.push(i)
    prev = i
  }

  const btnBase = 'px-3 py-1.5 rounded-md text-sm font-medium transition-colors'
  const btnActive = `${btnBase} bg-accent text-white cursor-default`
  const btnInactive = `${btnBase} text-[#8b949e] hover:text-[#cdd9e5] hover:bg-surface-3`
  const btnDisabled = `${btnBase} text-[#484f58] cursor-not-allowed`

  return (
    <nav className="flex items-center justify-center gap-1 mt-8" aria-label="Pagination">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className={page <= 1 ? btnDisabled : btnInactive}
      >
        ← Prev
      </button>

      {withEllipsis.map((item, idx) =>
        item === '...' ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-[#484f58]">…</span>
        ) : (
          <button
            key={item}
            onClick={() => item !== page && onChange(item)}
            className={item === page ? btnActive : btnInactive}
          >
            {item}
          </button>
        )
      )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= pages}
        className={page >= pages ? btnDisabled : btnInactive}
      >
        Next →
      </button>
    </nav>
  )
}
