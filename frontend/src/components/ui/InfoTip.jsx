import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Info } from 'lucide-react'

// Small help popover. Hover or focus opens it, tap toggles it (touch), Escape or outside tap closes it.
export default function InfoTip({ text, title, align = 'left' }) {
  const [open, setOpen] = useState(false)
  const [shift, setShift] = useState(0)
  const ref = useRef(null)
  const popRef = useRef(null)
  const id = useId()

  // Keep the popover inside the viewport by shifting it horizontally.
  useLayoutEffect(() => {
    if (!open || !popRef.current) return
    const r = popRef.current.getBoundingClientRect()
    const over = Math.max(0, r.right - window.innerWidth + 12) - Math.max(0, 12 - r.left)
    setShift(-over)
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close) }
  }, [open])

  if (!text) return null
  return (
    <span ref={ref} className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={title ? `About ${title}` : 'More info'}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center justify-center w-5 h-5 -my-0.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <span
          id={id}
          ref={popRef}
          role="tooltip"
          style={{ transform: `translateX(${shift}px)` }}
          className={`absolute top-full z-30 mt-1.5 w-64 max-w-[calc(100vw-1.5rem)] rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600 shadow-lg shadow-slate-900/5 ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {title && <span className="block mb-1 font-semibold text-slate-900">{title}</span>}
          {text}
        </span>
      )}
    </span>
  )
}
