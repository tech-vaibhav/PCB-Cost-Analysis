// LayerSummary — table of detected layers shown after parse
export default function LayerSummary({ layers }) {
  if (!layers || layers.length === 0) return null

  return (
    <div className="layer-table-wrap">
      <table className="layer-table">
        <thead>
          <tr>
            <th>Layer Name</th>
            <th>File</th>
            <th>Type</th>
            <th>Side</th>
            <th>Flashes</th>
            <th>Draws</th>
          </tr>
        </thead>
        <tbody>
          {layers.map((layer, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 500 }}>{layer.name}</td>
              <td style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace', fontSize: 12 }}>
                {layer.filename}
              </td>
              <td>
                <span className={`layer-type-badge layer-type-${layer.layer_type}`}>
                  {layer.layer_type}
                </span>
              </td>
              <td style={{ color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                {String(layer.side).replace('LayerSide.', '').toLowerCase()}
              </td>
              <td>{layer.flash_count ?? '—'}</td>
              <td>{layer.draw_count ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
