import { useState } from 'react'

export default function FileInput({ inputRef, accept, multiple, hint, onChange }) {
  const [fileNames, setFileNames] = useState([])
  const [dragging, setDragging] = useState(false)

  function handleChange(e) {
    const files = Array.from(e.target.files ?? [])
    setFileNames(files.map((f) => f.name))
    onChange?.(e)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (!files.length) return
    const dt = new DataTransfer()
    files.forEach((f) => dt.items.add(f))
    inputRef.current.files = dt.files
    setFileNames(files.map((f) => f.name))
    onChange?.({ target: inputRef.current })
  }

  function clear(e) {
    e.stopPropagation()
    inputRef.current.value = ''
    setFileNames([])
    onChange?.({ target: inputRef.current })
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`
        relative flex flex-col items-center gap-2 px-4 py-4 rounded-lg border-2 border-dashed cursor-pointer
        transition-colors select-none
        ${dragging
          ? 'border-accent bg-accent/10'
          : fileNames.length
            ? 'border-accent/40 bg-surface-2'
            : 'border-border hover:border-[#444c56] bg-surface-2 hover:bg-surface-3'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleChange}
      />

      {fileNames.length === 0 ? (
        <>
          <svg className="w-7 h-7 text-[#484f58]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <div className="text-center">
            <p className="text-sm text-[#8b949e]">
              Drag & drop or <span className="text-link">browse</span>
            </p>
            {hint && <p className="text-xs text-[#484f58] mt-0.5">{hint}</p>}
          </div>
        </>
      ) : (
        <div className="flex items-center gap-3 w-full">
          <svg className="w-5 h-5 text-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1 min-w-0">
            {fileNames.length === 1 ? (
              <p className="text-sm text-[#cdd9e5] truncate">{fileNames[0]}</p>
            ) : (
              <p className="text-sm text-[#cdd9e5]">{fileNames.length} files selected</p>
            )}
          </div>
          <button
            type="button"
            onClick={clear}
            className="text-[#8b949e] hover:text-[#cdd9e5] transition-colors shrink-0 p-0.5 rounded"
            title="Clear"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
