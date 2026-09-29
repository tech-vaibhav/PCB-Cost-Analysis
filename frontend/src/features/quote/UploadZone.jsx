import { useState } from 'react'
import { FileArchive, Upload } from 'lucide-react'
import { Spinner } from '../../components/ui'

export default function UploadZone({ onFile, fileName, loading }) {
  const [dragging, setDragging] = useState(false)
  const drop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0])
  }
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={drop}
      className={`flex items-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors has-focus-visible:ring-2 has-focus-visible:ring-emerald-200 ${
        fileName ? 'p-3' : 'flex-col p-6 text-center'
      } ${dragging ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
    >
      <input
        type="file"
        accept=".zip,application/zip"
        className="sr-only"
        onChange={(e) => { if (e.target.files[0]) onFile(e.target.files[0]); e.target.value = '' }}
      />
      <span className="grid place-items-center w-10 h-10 shrink-0 rounded-full bg-slate-100 text-slate-500">
        {loading ? <Spinner /> : fileName ? <FileArchive className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
      </span>
      {fileName ? (
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium text-slate-900 truncate">{fileName}</span>
          <span className="block text-xs text-slate-500">{loading ? 'Reading Gerber data' : 'Choose another ZIP to replace'}</span>
        </span>
      ) : (
        <span>
          <span className="block text-sm font-semibold text-slate-900">{dragging ? 'Drop to upload' : 'Upload Gerber ZIP'}</span>
          <span className="block text-xs text-slate-500 mt-0.5">Drag here or browse. ZIP only, max 50 MB</span>
        </span>
      )}
    </label>
  )
}
