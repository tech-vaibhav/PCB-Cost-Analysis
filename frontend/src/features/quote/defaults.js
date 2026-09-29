export const DEFAULT_QUOTE = {
  boardW: '', boardL: '', quantity: '5',
  layers: '2', orderType: 'Bare PCB', thickness: '1.6', copper: '1',
  material: 'FR4 TG130', maskColor: 'Green', silkscreen: 'White',
  finish: 'HASL-LF', traceSpace: '6/6', minHole: '0.30', ipcStd: 'IPC-2',
  testing: 'FlyingProbe', express: 'Standard',
  specials: { impedance: false, blindVias: false, goldFingers: false, halfHole: false, resinPlug: false, metalEdge: false, halogenFree: false },
}

export const snapToOption = (value, options) =>
  options.reduce((best, o) => (Math.abs(o - value) < Math.abs(best - value) ? o : best))

export const toQuoteBody = (v) => ({ ...v, boardW: Number(v.boardW), boardL: Number(v.boardL), quantity: Number(v.quantity) })

export const DEFAULT_OPTIONS = {
  orderType: ['Bare PCB', 'PCBA', 'Assembly Only'],
  layers: ['1', '2', '4', '6', '8'],
  thickness: ['0.6', '0.8', '1.0', '1.2', '1.6', '2.0', '2.4', '3.2'],
  copper: ['0.5', '1', '1.5', '2', '3', '4'],
  material: ['FR4 TG130', 'FR4 TG150', 'FR4 TG170', 'High-Freq', 'Aluminum'],
  maskColor: ['Green', 'Blue', 'Red', 'Black', 'White', 'Yellow', 'Purple'],
  silkscreen: ['White', 'Black', 'Yellow', 'None'],
  finish: ['HASL', 'HASL-LF', 'ENIG-1', 'ENIG-2', 'ENIG-3', 'ImmTin', 'ImmSilver', 'OSP'],
  traceSpace: ['6/6', '5/5', '4/4', '3/3'],
  minHole: ['0.40', '0.30', '0.25', '0.20', '0.15'],
  ipcStd: ['IPC-2', 'IPC-3'],
  testing: ['FlyingProbe', 'Fixture', 'None'],
  express: ['Standard', 'Urgent'],
  specials: Object.keys(DEFAULT_QUOTE.specials),
}
