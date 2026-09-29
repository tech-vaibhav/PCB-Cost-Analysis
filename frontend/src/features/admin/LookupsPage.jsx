import { useOutletContext } from 'react-router-dom'
import LookupTable from './LookupTable'
import Section from './Section'

// [name, title, hint, unit, valueType?]
const MAPS = [
  ['layerFactor', 'Layer count', 'Multiplier on laminate and process cost', 'x'],
  ['thicknessFactor', 'Thickness (mm)', 'Multiplier on laminate cost', 'x'],
  ['copperFactor', 'Copper weight (oz)', 'Multiplier on laminate cost', 'x'],
  ['finishSurchargePct', 'Surface finish', 'Surcharge on process cost', '%'],
  ['traceFactor', 'Trace and space (mil)', 'Multiplier on process cost', 'x'],
  ['minHoleRs', 'Minimum hole (mm)', 'Drilling cost per board', 'INR'],
  ['maskColorRs', 'Solder mask colour', 'Extra cost per board', 'INR'],
  ['testingRs', 'Testing', 'Test cost per board', 'INR'],
  ['expressFactor', 'Production speed', 'Multiplier on selling price', 'x'],
  ['ipcFactor', 'IPC class', 'Multiplier on process cost', 'x'],
  ['specialPct', 'Special requirements', 'Surcharge on laminate and process cost', '%'],
  ['specialEngFee', 'Special engineering fee', 'One-time fee per order', 'INR'],
  ['deliveryText', 'Delivery time', 'Shown to customers per production speed', null, 'text'],
]
const LISTS = [
  ['materialOptions', 'Materials', 'Quote form choices, not priced'],
  ['silkscreenOptions', 'Silkscreen colours', 'Quote form choices, not priced'],
]
const toPct = (f) => +(f * 100).toFixed(4)

export default function LookupsPage() {
  const { cfg } = useOutletContext()
  const { lookups } = cfg.draft

  return (
    <div className="grid gap-4 lg:grid-cols-2 items-start">
      {MAPS.map(([name, title, hint, unit, valueType = 'number']) => (
        <Section key={name} title={title} hint={hint}>
          <LookupTable
            rows={Object.entries(lookups[name] ?? {})}
            valueType={valueType}
            unit={unit}
            onChange={(_i, o, v) => cfg.setLookup(name, o, v)}
            onRemove={(_i, o) => cfg.removeLookupOption(name, o)}
            onAdd={(o, v) => cfg.addLookupOption(name, o, v)}
          />
        </Section>
      ))}
      <Section title="Auto markup ladder" hint="Markup on cost by order quantity, used when no fixed markup is set; above the last row 30% applies">
        <LookupTable
          rows={(lookups.autoMarkup ?? []).map(([q, f]) => [q, toPct(f)])}
          optionType="number"
          unit="%"
          headers={['Up to qty', 'Markup']}
          onChange={(i, q, pct) => cfg.setAutoMarkupRow(i, q, pct === '' ? '' : pct / 100)}
          onRemove={(i) => cfg.removeLookupOption('autoMarkup', i)}
          onAdd={(q, pct) => cfg.addLookupOption('autoMarkup', q, pct / 100)}
        />
      </Section>
      {LISTS.map(([name, title, hint]) => (
        <Section key={name} title={title} hint={hint}>
          <LookupTable
            rows={(lookups[name] ?? []).map((s) => [s])}
            valueType={null}
            headers={['Option']}
            onRemove={(i) => cfg.removeLookupOption(name, i)}
            onAdd={(o) => cfg.addLookupOption(name, o)}
          />
        </Section>
      ))}
    </div>
  )
}
