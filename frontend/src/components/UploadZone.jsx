import { useRef, useState } from 'react'
import { Upload, File, RotateCcw } from 'lucide-react'
import { parseGerber } from '../api/api'

export default function UploadZone({ onParsed, onLoading, onFile, compact = false }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState(null)

  const handleFile = async (file) => {
    if (!file) return
    setFileName(file.name)
    onLoading(true)
    if (onFile) onFile(file)
    try {
      const data = await parseGerber(file)
      onParsed(data)
    } catch (err) {
      onParsed({ __error: err.message })
    } finally {
      onLoading(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  /* Compact variant — shown after a file is already loaded */
  if (compact) {
    return (
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 w-full px-3.5 py-2.5 rounded-xl border border-dashed border-slate-200 bg-white text-xs text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-all duration-150 cursor-pointer"
      >
        <input ref={inputRef} type="file" accept=".zip,.rar,.7z" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
        <RotateCcw className="w-3.5 h-3.5" />
        Upload a different file
      </button>
    )
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={[
        'relative rounded-xl border-2 border-dashed p-6 text-center cursor-pointer',
        'transition-all duration-200 group bg-white',
        dragging
          ? 'border-blue-400 bg-blue-50/60 scale-[1.01]'
          : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/80',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".zip,.rar,.7z"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />

      <div className="flex flex-col items-center gap-3">
        <div className={[
          'w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200',
          dragging ? 'bg-blue-100' : 'bg-slate-100 group-hover:bg-blue-50',
        ].join(' ')}>
          <Upload className={`w-4.5 h-4.5 transition-colors ${dragging ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'}`} />
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-800">
            {dragging ? 'Drop your Gerber file' : 'Upload Gerber File'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">.zip · .rar · .7z — max 50 MB</p>
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
          className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
        >
          Browse files
        </button>

        {fileName && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <File className="w-3 h-3" />
            {fileName}
          </div>
        )}
      </div>
    </div>
  )
}
