// AutoBadge — shown next to fields that were auto-filled by the parser
export default function AutoBadge() {
  return (
    <span className="auto-badge">
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2,6 5,9 10,3" />
      </svg>
      Auto-detected
    </span>
  )
}
