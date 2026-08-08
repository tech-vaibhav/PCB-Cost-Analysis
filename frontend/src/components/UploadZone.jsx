import { useRef, useState } from 'react'

export default function UploadZone({ onParsed, onLoading, onFile }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState(null)

  const handleFile = async (file) => {
    if (!file) return
    setFileName(file.name)
    onLoading(true)
    if (onFile) onFile(file)   // pass raw file for viewer

    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/parse', { method: 'POST', body: form })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()
      onParsed(data)
    } catch (err) {
      onParsed({ __error: err.message })
    } finally {
      onLoading(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  return (
    <div
      className={`upload-zone${dragging ? ' upload-zone--drag' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".zip,.rar,.7z"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <div className="upload-icon">📁</div>
      <p className="upload-title">
        {dragging ? 'Drop your Gerber file here' : 'Add Gerber File'}
      </p>
      <p className="upload-sub">
        Accept only .zip or .rar files, Max 50 MB<br />
        All uploads are secure and confidential.
      </p>
      <button type="button" className="upload-btn" onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}>
        ⬆ Add gerber file
      </button>
      {fileName && (
        <p className="upload-file-name">✓ {fileName}</p>
      )}
    </div>
  )
}
