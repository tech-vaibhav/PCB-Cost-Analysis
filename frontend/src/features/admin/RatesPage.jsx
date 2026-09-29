import { useOutletContext } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import { Button, Field, Input, Switch, ToggleGroup } from '../../components/ui'
import Section from './Section'

// [key, label, unit, hint, kind?]
const SECTIONS = [
  { title: 'Panel', fields: [
    ['panelW', 'Panel width', 'mm', 'Production panel boards are nested on'],
    ['panelL', 'Panel length', 'mm', 'Production panel boards are nested on'],
    ['routingGap', 'Routing gap', 'mm', 'Spacing between boards on the panel'],
    ['edgeMargin', 'Edge margin', 'mm', 'Unusable border on each panel edge'],
    ['yieldPct', 'Yield', '%', 'Good boards per 100 made; drives scrap and overproduction'],
  ] },
  { title: 'Laminate and process', hint: 'In-house fabrication only', fields: [
    ['lamRate', 'Laminate rate', 'INR/m2', 'Scaled by layer, thickness and copper factors'],
    ['procRate', 'Process rate', 'INR/m2', 'Scaled by layer, finish, trace and IPC factors'],
  ] },
  { title: 'Components', hint: 'PCBA and assembly orders', fields: [
    ['bom', 'BOM per board', 'INR', 'Component cost per board'],
    ['compWastagePct', 'Component wastage', '%', 'Added to BOM for attrition'],
    ['compFreightPct', 'Component freight', '%', 'Added to BOM for inbound freight'],
  ] },
  { title: 'Consumables', hint: 'Per board; bare boards pay 40%', fields: [
    ['solderPaste', 'Solder paste', 'INR', 'Per board'],
    ['consumables', 'Other consumables', 'INR', 'Per board'],
    ['drillRouterWear', 'Drill and router wear', 'INR', 'Per board, in-house fabrication only'],
  ] },
  { title: 'Labour', hint: 'Monthly cost, shared across orders via overhead allocation', fields: [
    ['workDays', 'Working days', 'days', 'Per month'],
    ['shifts', 'Shifts', '', 'Per day'],
    ['opsPerShift', 'Operators per shift', '', 'Headcount on the line'],
    ['opSalary', 'Operator salary', 'INR', 'Monthly, per operator'],
    ['qcSalary', 'QC salary', 'INR', 'Monthly, per shift'],
    ['supervisorSalary', 'Supervisor salary', 'INR', 'Monthly, per shift; also sets the CAM hourly rate'],
    ['benefitsPct', 'Benefits', '%', 'Added on top of salaries'],
    ['reworkPct', 'Rework', '%', 'Extra labour for rework'],
    ['camTimeHrs', 'CAM time', 'hrs', 'Engineering hours per order'],
  ] },
  { title: 'Energy', hint: 'Monthly cost, shared across orders via overhead allocation', fields: [
    ['loadKw', 'Connected load', 'kW', 'Machine load when running'],
    ['runHours', 'Run hours', 'hrs', 'Machine hours per shift'],
    ['utilPct', 'Utilisation', '%', 'Average share of load drawn'],
    ['tariff', 'Tariff', 'INR/kWh', 'Electricity price'],
    ['lighting', 'Lighting', 'INR', 'Monthly'],
    ['nitrogen', 'Nitrogen', 'INR', 'Monthly'],
    ['waterEffluent', 'Water and effluent', 'INR', 'Monthly'],
  ] },
  { title: 'Overheads', hint: 'Monthly fixed costs, shared across orders via overhead allocation', fields: [
    ['rent', 'Rent', 'INR'], ['admin', 'Admin', 'INR'], ['marketing', 'Marketing', 'INR'],
    ['software', 'Software', 'INR'], ['maintenance', 'Maintenance', 'INR'], ['insurance', 'Insurance', 'INR'],
    ['interest', 'Interest', 'INR'], ['misc', 'Miscellaneous', 'INR'], ['depreciation', 'Depreciation', 'INR'],
  ] },
  { title: 'Packaging and fees', fields: [
    ['esdBag', 'ESD bag', 'INR', 'Per board; bare boards pay half'],
    ['cartonPacking', 'Carton packing', 'INR', 'Per board, assembly orders'],
    ['shipping', 'Shipping', 'INR', 'Per board; bare boards pay half'],
    ['bankChargesPct', 'Bank charges', '%', 'On selling price'],
    ['warrantyPct', 'Warranty reserve', '%', 'On selling price'],
    ['compliance', 'Compliance', 'INR', 'Per order'],
    ['tooling', 'Tooling', 'INR', 'Per order, in-house fabrication only'],
  ] },
  { title: 'Pricing policy', fields: [
    ['ohAllocPct', 'Overhead allocation', '%', 'Share of monthly labour, energy and overheads charged per order'],
    ['markupOverridePct', 'Markup', '%', 'Fixed markup on cost', 'markup'],
    ['beatCompetitor', 'Beat cheapest competitor', '', 'Price under the cheapest landed competitor when that stays above cost', 'switch'],
    ['fabSource', 'Bare board source', '', 'Outsource buys boards at the cheapest competitor price', 'fab'],
  ] },
  { title: 'Constants', target: 'constants', fields: [
    ['usdInr', 'USD to INR', 'INR', 'Converts competitor USD prices'],
    ['gstPct', 'GST', '%', 'Added to the order subtotal'],
    ['landedFactor', 'Landed factor', 'x', 'Import price to landed cost multiplier'],
    ['importDutyPct', 'Import duty', '%', 'On imported competitor boards'],
    ['baseEngFee', 'Base engineering fee', 'INR', 'One-time, per order'],
    ['extraLayerFee', 'Extra layer fee', 'INR', 'Per layer pair above 2'],
    ['beatCompetitorPct', 'Beat by', '%', 'How far under the cheapest competitor to price'],
    ['camHoursPerMonth', 'CAM hours per month', 'hrs', 'Turns supervisor salary into a CAM hourly rate'],
  ] },
]
const FAB = [{ value: 'outsource', label: 'Outsource' }, { value: 'inhouse', label: 'In-house' }]
const toNum = (v) => (v === '' ? '' : Number(v))

export default function RatesPage() {
  const { cfg } = useOutletContext()

  const control = (target, [key, , unit, , kind]) => {
    const value = cfg.draft[target][key]
    const set = target === 'rates' ? cfg.setRate : cfg.setConstant
    if (kind === 'switch') return <div className="h-10 flex items-center"><Switch id={key} checked={!!value} onChange={(v) => set(key, v)} /></div>
    if (kind === 'fab') return <ToggleGroup options={FAB} value={value} onChange={(v) => set(key, v)} />
    const input = <Input id={key} type="number" inputMode="decimal" step="any" suffix={unit} value={value ?? ''} disabled={kind === 'markup' && value == null} placeholder={value == null ? 'Auto' : undefined} onChange={(e) => set(key, toNum(e.target.value))} />
    if (kind !== 'markup') return input
    return (
      <>
        {input}
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" className="accent-emerald-600" checked={value == null} onChange={(e) => set(key, e.target.checked ? null : 10)} />
          Auto markup by quantity
        </label>
      </>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">All money in INR. Changes apply to new quotes after saving.</p>
        <Button variant="ghost" size="sm" icon={RotateCcw} className="shrink-0 whitespace-nowrap" onClick={cfg.reset} disabled={cfg.busy}>Restore defaults</Button>
      </div>
      {SECTIONS.map(({ title, hint, target = 'rates', fields }) => (
        <Section key={title} title={title} hint={hint}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {fields.map((f) => (
              <Field key={f[0]} label={f[1]} hint={f[3]} htmlFor={f[0]}>{control(target, f)}</Field>
            ))}
          </div>
        </Section>
      ))}
    </div>
  )
}
