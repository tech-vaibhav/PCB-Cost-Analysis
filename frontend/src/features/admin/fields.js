import {
  Activity, Building2, CircleDot, Compass, Cpu, Droplets, Factory, Grid2x2, Layers, ListChecks, Package, Palette,
  Percent, PieChart, Receipt, Ruler, Scale, ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles, Spline, Star, Timer, Trophy, Users, Weight, Wrench, Zap,
} from 'lucide-react'

// Drives PricingPage and CostsPage: SECTIONS[page][tab] = [{ icon, tint, title, description, help?, fields }].
// field.kind: rate | constant (number, or control 'switch' | 'auto', or options) | lookup | list | ladder | competitors.
const rate = (key, label, unit, help, extra) => ({ key, kind: 'rate', label, unit, help, ...extra })
const constant = (key, label, unit, help) => ({ key, kind: 'constant', label, unit, help })
const lookup = (key, unit, headers, extra) => ({ key, kind: 'lookup', unit, headers, ...extra })
const one = (icon, tint, title, description, help, key, unit, headers) =>
  ({ icon, tint, title, description, help, fields: [lookup(key, unit, headers)] })
const list = (key, label, help) => ({ key, kind: 'list', label, help, headers: ['Option'] })
const monthly = (key, label, what) =>
  rate(key, label, 'INR', `${what} per month. Part of the fixed overheads charged to each order through overhead allocation.`)
const isAuto = (d) => d.rates.markupOverridePct == null

export const SECTIONS = {
  pricing: {
    rules: [
      { icon: ShoppingBag, tint: 'bg-slate-100 text-slate-900', title: 'Order types', description: 'Options on the quote form and whether they include assembly',
        help: 'Order types the customer can pick. Assembly types add components, assembly labour and full packaging; the others are priced as bare boards.',
        fields: [lookup('orderTypes', null, ['Order type', 'Includes assembly'], { valueType: 'boolean' })] },
      one(Layers, 'bg-slate-100 text-slate-900', 'Layers', 'Multiplier on laminate and process cost',
        'Scales laminate and process cost by layer count, with 2 layers as the 1x baseline. More layers cost more per board, and each pair above 2 also adds the extra layer fee.',
        'layerFactor', 'x', ['Layers', 'Multiplier']),
      one(Ruler, 'bg-slate-100 text-slate-900', 'Thickness', 'Multiplier on laminate cost',
        'Scales laminate cost by board thickness in mm. Thicker boards use more material, so a higher factor raises the price.',
        'thicknessFactor', 'x', ['Thickness (mm)', 'Multiplier']),
      one(Weight, 'bg-slate-100 text-slate-900', 'Copper weight', 'Multiplier on laminate cost',
        'Scales laminate cost by copper weight in oz. Heavier copper costs more per square metre of board.',
        'copperFactor', 'x', ['Copper (oz)', 'Multiplier']),
      one(Sparkles, 'bg-yellow-50 text-yellow-600', 'Surface finish', 'Surcharge on process cost',
        'Percent added to process cost for each finish, with HASL as the zero baseline. A negative value makes that finish cheaper.',
        'finishSurchargePct', '%', ['Finish', 'Surcharge']),
      one(Spline, 'bg-slate-100 text-slate-900', 'Trace and space', 'Multiplier on process cost',
        'Scales process cost by the finest trace width and gap in mil. Finer lines need tighter process control, so they cost more.',
        'traceFactor', 'x', ['Trace/space (mil)', 'Multiplier']),
      one(CircleDot, 'bg-slate-100 text-slate-900', 'Minimum hole', 'Drilling charge per board',
        'Drilling charge added to each board for the smallest hole size in mm. Smaller holes need finer bits and slower drilling. Not charged when outsourcing.',
        'minHoleRs', 'INR', ['Hole (mm)', 'Per board']),
      one(Palette, 'bg-slate-100 text-slate-900', 'Solder mask colour', 'Extra charge per board',
        'Extra charge per board for each mask colour on top of green. In-house fabrication only; bare boards pay the bare board consumables share of it.',
        'maskColorRs', 'INR', ['Colour', 'Per board']),
      one(ShieldCheck, 'bg-slate-100 text-slate-900', 'IPC class', 'Multiplier on process cost',
        'Scales process cost by IPC acceptance class. Class 3 means stricter tolerances and inspection, so it costs more.',
        'ipcFactor', 'x', ['Class', 'Multiplier']),
      one(Activity, 'bg-cyan-50 text-cyan-600', 'Electrical testing', 'Test charge per board',
        'Test charge added to each board for the chosen method. Fixture testing costs more per board than flying probe.',
        'testingRs', 'INR', ['Method', 'Per board']),
      { icon: Timer, tint: 'bg-slate-100 text-slate-900', title: 'Delivery speed', description: 'Price multiplier and lead time per speed', fields: [
        lookup('expressFactor', 'x', ['Speed', 'Multiplier'], { label: 'Price multiplier', help: 'Multiplies the final selling price for each production speed. Above 1, that speed costs the customer more.' }),
        lookup('deliveryText', null, ['Speed', 'Lead time'], { label: 'Lead time shown', valueType: 'text', help: 'Delivery time shown to the customer for each speed. Text only, it does not change the price.' }),
      ] },
      { icon: Star, tint: 'bg-slate-100 text-slate-900', title: 'Special requirements', description: 'Surcharge and one-time fee per ticked requirement', fields: [
        lookup('specialPct', '%', ['Requirement', 'Surcharge'], { label: 'Cost surcharge', help: 'Percent added to laminate plus process cost for each ticked requirement; several ticks add up. In-house fabrication only.' }),
        lookup('specialEngFee', 'INR', ['Requirement', 'Fee'], { label: 'Engineering fee', help: 'One-time fee added to the order for each ticked requirement. Spread across the boards in the list price.' }),
      ] },
      { icon: ListChecks, tint: 'bg-slate-100 text-slate-900', title: 'Customer options', description: 'Choices on the quote form. These do not affect price.', fields: [
        list('materialOptions', 'Materials', 'Base materials the customer can pick. Shown on the quote only, it does not change the price.'),
        list('silkscreenOptions', 'Silkscreen colours', 'Silkscreen colours the customer can pick. Shown on the quote only, it does not change the price.'),
      ] },
    ],
    policy: [
      { icon: Percent, tint: 'bg-slate-100 text-slate-900', title: 'Markup', description: 'Profit added on top of cost', fields: [
        rate('markupOverridePct', 'Auto markup by quantity', null, 'When on, markup comes from the quantity ladder, so small orders carry more markup than large ones. Turn off to use one fixed markup for every order.', { control: 'auto' }),
        rate('markupOverridePct', 'Fixed markup', '%', 'Profit added to cost per board before bank charges and warranty. At 10%, a 100 INR cost sells for 110 INR.', { show: (d) => !isAuto(d) }),
        { key: 'autoMarkup', kind: 'ladder', label: 'Markup ladder', headers: ['Up to qty', 'Markup'], show: isAuto,
          help: 'Markup used for orders up to each quantity. Larger orders use the markup above the last tier.' },
        rate('markupBeyondTiersPct', 'Markup above the last tier', '%', 'Used when the quantity is larger than the last row of the ladder.', { show: isAuto }),
      ] },
      { icon: Trophy, tint: 'bg-slate-100 text-slate-900', title: 'Beat competitor', description: 'Undercut the cheapest landed competitor when it pays', fields: [
        rate('beatCompetitor', 'Beat cheapest competitor', null, 'When on, the price drops to just under the cheapest landed competitor, as long as that still covers your cost. Otherwise the markup price is used.', { control: 'switch' }),
        constant('beatCompetitorPct', 'Beat by', '%', 'How far under the cheapest competitor to price. At 5%, a competitor at 100 INR means you quote 95 INR.'),
      ] },
      { icon: Scale, tint: 'bg-slate-100 text-slate-900', title: 'Competitor models', description: 'Price formulas for the competitors you compare against',
        help: 'Estimated competitor prices come from these formulas. USD import models convert with the USD rate, add freight and import duty; INR domestic models are already landed.',
        fields: [{ key: 'competitors', kind: 'competitors' }] },
      { icon: Compass, tint: 'bg-slate-100 text-slate-900', title: 'Engineering fees', description: 'One-time fees per order', fields: [
        constant('baseEngFee', 'Base engineering fee', 'INR', 'One-time setup fee on every order except outsourced bare boards. Spread across the boards in the list price.'),
        constant('extraLayerFee', 'Extra layer fee', 'INR', 'One-time fee for each layer pair above 2. A 6 layer board pays it twice.'),
      ] },
      { icon: Receipt, tint: 'bg-slate-100 text-slate-900', title: 'Taxes and currency', description: 'GST, exchange rate and import costs for competitor prices', fields: [
        constant('gstPct', 'GST', '%', 'Tax added to the order subtotal. It shows in the customer total but is not part of your profit.'),
        constant('usdInr', 'USD to INR', 'INR', 'Rate used to convert competitor USD prices. A higher rate makes imported boards dearer, so auto-beat prices rise.'),
        constant('landedFactor', 'Landed factor', 'x', 'Multiplier from competitor import price to landed cost in India, covering freight and clearance. Higher values make competitors look dearer.'),
        constant('importDutyPct', 'Import duty', '%', 'Customs duty on imported competitor boards. Raises their landed price, which auto-beat compares against.'),
      ] },
      { icon: PieChart, tint: 'bg-slate-100 text-slate-900', title: 'Overhead allocation', description: 'How much monthly running cost each order carries', fields: [
        rate('ohAllocPct', 'Overhead allocation', '%', 'Share of monthly labour, energy and overheads charged to one order, then split across its boards. Higher values raise cost per board on every order.'),
      ] },
    ],
  },
  costs: {
    production: [
      { icon: Factory, tint: 'bg-slate-100 text-slate-900', title: 'Fab source', description: 'Make bare boards in-house or buy them in', fields: [
        rate('fabSource', 'Bare board source', null, 'In-house builds the board from laminate and process rates. Outsource buys the bare board from the cheapest estimated supplier and skips laminate, process, drilling and tooling.',
          { options: [{ value: 'inhouse', label: 'In-house' }, { value: 'outsource', label: 'Outsource' }] }),
      ] },
      { icon: SlidersHorizontal, tint: 'bg-slate-100 text-slate-900', title: 'Cost shares', description: 'How much of each cost bare boards and outsourced orders carry', fields: [
        rate('bareConsumablesSharePct', 'Bare board consumables share', '%', 'Share of solder paste, consumables and mask colour charge a bare board pays. Assembly orders pay in full.'),
        rate('barePackagingSharePct', 'Bare board packaging share', '%', 'Share of ESD bag and shipping a bare board pays. Assembly orders pay in full.'),
        rate('outsourceLabourSharePct', 'Labour share when outsourcing', '%', 'Share of the allocated monthly labour cost charged when the bare board is bought in.'),
        rate('outsourceEnergySharePct', 'Energy share when outsourcing', '%', 'Share of the allocated monthly energy cost charged when the bare board is bought in.'),
      ] },
      { icon: Grid2x2, tint: 'bg-slate-100 text-slate-900', title: 'Panel', description: 'Production panel boards are nested on', fields: [
        rate('panelW', 'Panel width', 'mm', 'Width of the production panel. Bigger panels fit more boards, lowering material cost per board.'),
        rate('panelL', 'Panel length', 'mm', 'Length of the production panel. Bigger panels fit more boards, lowering material cost per board.'),
        rate('routingGap', 'Routing gap', 'mm', 'Space left between boards for the router. A wider gap fits fewer boards per panel.'),
        rate('edgeMargin', 'Edge margin', 'mm', 'Unusable border on each side of the panel. A bigger margin fits fewer boards per panel, so material cost per board goes up.'),
        rate('yieldPct', 'Yield', '%', 'Good boards out of every 100 made. Lower yield means making extra boards and adds scrap cost to every order.'),
      ] },
      { icon: Layers, tint: 'bg-slate-100 text-slate-900', title: 'Laminate and process', description: 'In-house fabrication only', fields: [
        rate('lamRate', 'Laminate rate', 'INR/m2', 'Base laminate cost per square metre of panel. Scaled by the layer, thickness and copper multipliers.'),
        rate('procRate', 'Process rate', 'INR/m2', 'Base cost of imaging, plating, etching and mask per square metre. Scaled by the layer, finish, trace and IPC multipliers.'),
      ] },
      { icon: Cpu, tint: 'bg-slate-100 text-slate-900', title: 'Components', description: 'PCBA and assembly orders only', fields: [
        rate('bom', 'BOM per board', 'INR', 'Component cost per board on assembly orders. Bare PCB orders ignore it.'),
        rate('compWastagePct', 'Component wastage', '%', 'Extra parts bought to cover losses on the line. Added on top of the BOM.'),
        rate('compFreightPct', 'Component freight', '%', 'Inbound freight on components as a percent of BOM. Added on top of the BOM.'),
      ] },
      { icon: Droplets, tint: 'bg-slate-100 text-slate-900', title: 'Consumables', description: 'Per board; bare boards pay a share', fields: [
        rate('solderPaste', 'Solder paste', 'INR', 'Solder paste used per board. Bare PCB orders pay the bare board consumables share of it.'),
        rate('consumables', 'Other consumables', 'INR', 'Flux, wipes and other small materials per board. Bare PCB orders pay the bare board consumables share of it.'),
        rate('drillRouterWear', 'Drill and router wear', 'INR', 'Drill bit and router wear per board. In-house fabrication only.'),
      ] },
    ],
    operations: [
      { icon: Users, tint: 'bg-slate-100 text-slate-900', title: 'Labour', description: 'Monthly cost, shared across orders through overhead allocation', fields: [
        rate('workDays', 'Working days', 'days', 'Working days in a month. Sets machine run hours and so the monthly energy bill.'),
        rate('shifts', 'Shifts', 'per day', 'Shifts run each day. Multiplies headcount, shift salaries and machine run hours.'),
        rate('opsPerShift', 'Operators per shift', 'people', 'Operators on the line each shift. More operators raise the monthly labour bill.'),
        rate('opSalary', 'Operator salary', 'INR', 'Monthly salary per operator. Feeds the monthly labour bill shared across orders.'),
        rate('qcSalary', 'QC salary', 'INR', 'Monthly quality control salary per shift. Leave at zero if operators do QC.'),
        rate('supervisorSalary', 'Supervisor salary', 'INR', 'Monthly supervisor salary per shift. Also sets the CAM hourly rate for engineering time.'),
        rate('benefitsPct', 'Benefits', '%', 'PF, ESI, bonus and other benefits as a percent of salaries. Added to the monthly labour bill.'),
        rate('reworkPct', 'Rework', '%', 'Extra labour for fixing faulty boards. Added on top of labour cost per board.'),
        rate('camTimeHrs', 'CAM time', 'hrs', 'Engineering hours to prepare each in-house order. Charged at the CAM hourly rate and spread across the boards.'),
        constant('camHoursPerMonth', 'CAM hours per month', 'hrs', 'Hours a month used to turn supervisor salary into a CAM hourly rate. Fewer hours means a higher rate.'),
      ] },
      { icon: Zap, tint: 'bg-slate-100 text-slate-900', title: 'Energy', description: 'Monthly cost, shared across orders through overhead allocation', fields: [
        rate('loadKw', 'Connected load', 'kW', 'Machine load when running. Drives the monthly electricity bill.'),
        rate('runHours', 'Run hours', 'hrs', 'Machine hours per shift. More hours means more units used each month.'),
        rate('utilPct', 'Utilisation', '%', 'Average share of connected load actually drawn. Lower utilisation means fewer units billed each month.'),
        rate('tariff', 'Tariff', 'INR/kWh', 'Electricity price per unit. Multiplies the monthly units used.'),
        rate('lighting', 'Lighting', 'INR', 'Monthly lighting bill, added to the energy cost.'),
        rate('nitrogen', 'Nitrogen', 'INR', 'Monthly nitrogen cost for reflow, added to the energy cost.'),
        rate('waterEffluent', 'Water and effluent', 'INR', 'Monthly water and effluent treatment cost, added to the energy cost.'),
      ] },
      { icon: Building2, tint: 'bg-slate-100 text-slate-900', title: 'Overheads', description: 'Monthly fixed costs, shared across orders through overhead allocation', fields: [
        monthly('rent', 'Rent', 'Factory and office rent'), monthly('admin', 'Admin', 'Office and admin staff cost'),
        monthly('marketing', 'Marketing', 'Marketing spend'), monthly('software', 'Software', 'Software licences'),
        monthly('maintenance', 'Maintenance', 'Machine and building upkeep'), monthly('insurance', 'Insurance', 'Insurance premiums'),
        monthly('interest', 'Interest', 'Loan interest'), monthly('misc', 'Miscellaneous', 'Other fixed costs'),
        monthly('depreciation', 'Depreciation', 'Machine depreciation'),
      ] },
      { icon: Package, tint: 'bg-slate-100 text-slate-900', title: 'Packaging and fees', description: 'Per board and per order charges', fields: [
        rate('esdBag', 'ESD bag', 'INR', 'Anti-static bag per board. Bare PCB orders pay the bare board packaging share.'),
        rate('cartonPacking', 'Carton packing', 'INR', 'Carton and packing per board. Charged on assembly orders only.'),
        rate('shipping', 'Shipping', 'INR', 'Outbound shipping per board. Bare PCB orders pay the bare board packaging share.'),
        rate('bankChargesPct', 'Bank charges', '%', 'Bank and payment fees as a percent of selling price. Added on top of the marked up price.'),
        rate('warrantyPct', 'Warranty reserve', '%', 'Reserve for warranty claims as a percent of selling price. Added on top of the marked up price.'),
        rate('compliance', 'Compliance', 'INR', 'Fixed compliance cost per order, such as certificates and paperwork. Spread across the boards.'),
      ] },
      { icon: Wrench, tint: 'bg-slate-100 text-slate-900', title: 'Tooling', description: 'One-time setup per in-house order', fields: [
        rate('tooling', 'Tooling', 'INR', 'Stencils, fixtures and setup for each in-house order. Spread across the boards, so small orders feel it most.'),
      ] },
    ],
  },
}
