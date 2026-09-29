# Pricing model

Ported from the Pelectro PCB Calculator. All money in INR. Per board unless stated.

## Quote inputs (customer)
- orderType: a key of lookups.orderTypes (Bare PCB | PCBA | Assembly Only). isAssembly = orderTypes[orderType]
- boardW, boardL (mm), quantity (min 1), layers: 1|2|4|6|8
- thickness: 0.6|0.8|1.0|1.2|1.6|2.0|2.4|3.2, copper oz: 0.5|1|1.5|2|3|4
- material: FR4 TG130|FR4 TG150|FR4 TG170|High-Freq|Aluminum (display only, not priced)
- maskColor, silkscreen (silkscreen display only), finish, traceSpace, minHole, ipcStd, testing, express
- specials ({key: bool}, keys from specialPct, missing = no): impedance, blindVias, goldFingers, halfHole, resinPlug, metalEdge, halogenFree

## Admin config

### rates (numbers)
panelW 250, panelL 250, routingGap 5, edgeMargin 10, yieldPct 94, workDays 26, shifts 1,
lamRate 1600 (INR/m2), procRate 900 (INR/m2),
bom 80, solderPaste 8, consumables 12, compWastagePct 2, drillRouterWear 3, compFreightPct 3,
tooling 15000, opsPerShift 1, opSalary 18000, qcSalary 0, supervisorSalary 0, benefitsPct 18, reworkPct 5, camTimeHrs 2,
loadKw 15, runHours 8, utilPct 60, tariff 8.5, lighting 5000, nitrogen 2000, waterEffluent 2000,
rent 15000, admin 10000, marketing 5000, software 3000, maintenance 3000, insurance 2000, interest 5000, misc 3000, depreciation 8000,
esdBag 2.5, cartonPacking 1.5, shipping 5, bankChargesPct 0.5, warrantyPct 1, compliance 500,
ohAllocPct 15, markupBeyondTiersPct 30 (markup above the last tier), bareConsumablesSharePct 40, barePackagingSharePct 50,
outsourceLabourSharePct 60, outsourceEnergySharePct 50, markupOverridePct 10 (null = auto ladder), beatCompetitor true, fabSource "outsource" | "inhouse"

### lookups (option -> value)
- layerFactor: {1:0.7, 2:1, 4:1.8, 6:2.6, 8:3.4}
- thicknessFactor: {0.6:0.85, 0.8:0.9, 1.0:0.95, 1.2:1, 1.6:1.1, 2.0:1.25, 2.4:1.4, 3.2:1.6}
- copperFactor: {0.5:0.95, 1:1, 1.5:1.15, 2:1.35, 3:1.7, 4:2.2}
- finishSurchargePct: {HASL:0, HASL-LF:8, ENIG-1:20, ENIG-2:28, ENIG-3:35, ImmTin:12, ImmSilver:15, OSP:-5}
- traceFactor: {6/6:1, 5/5:1.1, 4/4:1.25, 3/3:1.5}
- minHoleRs: {0.40:0, 0.30:3, 0.25:8, 0.20:15, 0.15:25}
- maskColorRs: {Green:0, Blue:2, Red:2, Black:3, White:3, Yellow:2, Purple:5}
- testingRs: {FlyingProbe:3, Fixture:8, None:0}
- expressFactor: {Standard:1, Urgent:1.5}
- deliveryText: {Standard:"7-10 working days", Urgent:"3-5 working days"}
- ipcFactor: {IPC-2:1, IPC-3:1.15}
- specialPct: {impedance:12, blindVias:25, goldFingers:10, halfHole:8, resinPlug:10, metalEdge:15, halogenFree:8}
- specialEngFee: {impedance:1000, blindVias:2000, goldFingers:500, halfHole:500, resinPlug:500, metalEdge:500, halogenFree:500}
- autoMarkup (qty ceiling -> markup fraction, ordered): [[5,1.0],[10,0.9],[20,0.8],[50,0.72],[100,0.65],[300,0.58],[500,0.5],[1000,0.42],[2000,0.35]] then markupBeyondTiersPct/100
- materialOptions: [FR4 TG130, FR4 TG150, FR4 TG170, High-Freq, Aluminum]
- silkscreenOptions: [White, Black, Yellow, None]
- orderTypes (option -> isAssembly, ordered): {Bare PCB:false, PCBA:true, Assembly Only:true}
- competitors (ordered): name, model (usd_import | inr_domestic), note, isBareSource, params
  - JLCPCB usd_import bare source: min_qty_cap 5, per_board_fixed_usd 2, per_board_floor_usd 0.08, area_rate_usd_per_m2 12, order_fee_usd 18, order_fee_per_board_usd 0.03, order_fee_cap_usd 15, freight_pct 10, asm_floor_usd 0.48, asm_base_usd 0.15, asm_area_rate_usd_per_m2 80
  - PCBWay usd_import bare source: min_qty_cap 5, per_board_fixed_usd 3, per_board_floor_usd 0.12, area_rate_usd_per_m2 18, order_fee_usd 22, order_fee_per_board_usd 0.04, order_fee_cap_usd 18, freight_pct 10, asm_floor_usd 0.624, asm_base_usd 0.195, asm_area_rate_usd_per_m2 104
  - JPCPCB inr_domestic bare source: min_qty_cap 10, per_board_fixed_inr 80, per_board_floor_inr 12, area_rate_inr_per_m2 7000, area_rate_landed_inr_per_m2 8500, multilayer_extra 0, fixed_scales_with_layers 0, order_fee_inr 200, order_fee_per_board_inr 2, order_fee_cap_inr 500, asm_floor_inr 15, asm_base_inr 5, asm_area_rate_inr_per_m2 5000
  - Megabyte inr_domestic: min_qty_cap 10, per_board_fixed_inr 50, per_board_floor_inr 8, area_rate_inr_per_m2 5000, area_rate_landed_inr_per_m2 5000, multilayer_extra 0.8, fixed_scales_with_layers 1, order_fee_inr 150, order_fee_per_board_inr 1.5, order_fee_cap_inr 400, asm_floor_inr 12, asm_base_inr 4, asm_area_rate_inr_per_m2 4000

### constants
usdInr 88, gstPct 18, landedFactor 1.3, importDutyPct 10, baseEngFee 1000, extraLayerFee 500, beatCompetitorPct 5, camHoursPerMonth 160

## Formulas

Symbols: L=boardW, I=boardL, o=quantity, S=isAssembly, u=(fabSource==outsource), y=(u and orderType==Bare PCB)

Panel
- perRow = floor((panelW - 2*edgeMargin + routingGap) / (L + routingGap)), min 0
- perCol = floor((panelL - 2*edgeMargin + routingGap) / (I + routingGap)), min 0
- boardsPerPanel f = perRow*perCol
- panelArea E = panelW*panelL/1e6 m2, boardArea h = L*I/1e6 m2
- matArea Q = f>0 ? E/f : h
- utilizationPct = E>0 ? h*f/E*100 : 0

Factors
- lf=layerFactor[layers], tf=thicknessFactor, cf=copperFactor, fin=finishSurchargePct, trf=traceFactor, ipc=ipcFactor, ex=expressFactor
- specialPctSum A = sum specialPct over yes; engFeeExtra Pe = sum specialEngFee over yes

Cost heads
- laminate V = u ? 0 : Q*lamRate*lf*tf*cf
- process P_ = u ? 0 : Q*procRate*lf*(1+fin/100)*trf*ipc
- bomCost F = S ? bom*(1+compWastagePct/100)*(1+compFreightPct/100) : 0
- consumables Fa = (solderPaste + consumables + (u?0:drillRouterWear) + (u?0:maskColorRs)) * (S ? 1 : bareConsumablesSharePct/100)
- special wa = u ? 0 : (V+P_)*A/100
- drilling Cn = u ? 0 : minHoleRs
- testing W = testingRs

Competitors (INR/board), p = that competitor's params, usd=usdInr, duty=importDutyPct/100, landed=landedFactor
- usd_import:
  base = max(per_board_fixed_usd/min(o,min_qty_cap), per_board_floor_usd) + h*area_rate_usd_per_m2*lf
  fee = order_fee_usd + min(o*order_fee_per_board_usd, order_fee_cap_usd)
  asm = S ? max(asm_floor_usd, asm_base_usd + h*asm_area_rate_usd_per_m2) : 0
  bare = (base*o + fee)*usd*(1 + freight_pct/100)/o
  kt = (base+asm)*o ; landedPrice = ((kt+fee)*usd + kt*usd*duty + F*o)/o*landed
- inr_domestic:
  lfx = lf + (lf>1 ? multilayer_extra : 0)
  fixed = max(per_board_fixed_inr/min(o,min_qty_cap), per_board_floor_inr) * (fixed_scales_with_layers ? lfx : 1)
  fee = order_fee_inr + min(o*order_fee_per_board_inr, order_fee_cap_inr)
  bare = fixed + h*area_rate_inr_per_m2*lfx + fee/o
  asm = S ? max(asm_floor_inr, asm_base_inr + h*asm_area_rate_inr_per_m2) : 0
  landedPrice = ((fixed + h*area_rate_landed_inr_per_m2*lfx + asm)*o + fee + F*o)/o*landed
- outsourcedBare Na = u ? min bare over competitors with isBareSource : 0 ; outsourcedFrom = name of the min

Material per board K = y ? Na : V + P_ + Na + F + Fa + wa + Cn + W

Yield and volume
- P = clamp(yieldPct,1,100)/100 ; produced g = y ? o : o/P ; panelsNeeded = f>0 ? ceil(g/f) : 0

Labour (monthly)
- ops = opsPerShift*shifts ; opCost = ops*opSalary ; qc = qcSalary*shifts ; sup = supervisorSalary*shifts
- base q = opCost+qc+sup ; benefits = q*benefitsPct/100 ; labourMonth Z = q+benefits
- Oa = ohAllocPct/100
- labour ee = y ? 0 : (g>0 ? Z*Oa/g*(1+reworkPct/100)*(u?outsourceLabourSharePct/100:1) : 0)
- camHourly = supervisorSalary/camHoursPerMonth ; camOrder ae = camTimeHrs*camHourly

Energy (monthly)
- runHrs Da = workDays*shifts*runHours ; kwh ye = loadKw*Da*utilPct/100 ; power Ya = ye*tariff
- energyMonth ke = Ya + lighting + nitrogen + waterEffluent
- energy te = y ? 0 : (g>0 ? ke*Oa/g*(u?outsourceEnergySharePct/100:1) : 0)

Overheads
- overheadMonth oe = rent+admin+marketing+software+maintenance+insurance+interest+misc+depreciation
- overhead ne = y ? 0 : (g>0 ? oe*Oa/g : 0)

Packaging (ps = barePackagingSharePct/100) w = y ? esdBag*ps : (S ? esdBag+cartonPacking+shipping : (esdBag+shipping)*ps)

Totals
- baseCost Me = K+ee+te+ne+w
- scrap Te = y ? 0 : Me*(1-P)/P
- toolingPer re = tooling/o ; camPer G = ae/o ; compliancePer Ha = y ? 0 : compliance/o
- orderCost = Me*g + (u?0:tooling) + (u?0:ae) + compliance ; costPerBoard v = orderCost/o

Price
- markup = markupOverridePct != null ? markupOverridePct/100 : autoMarkup(o)
- se = v*(1+markup)*ex ; bank xe = se*bankChargesPct/100 ; warranty Re = se*warrantyPct/100 ; Bn = se+xe+Re
- engFee Xa = y ? 0 : baseEngFee + Pe + (lf>1 ? extraLayerFee*(layers/2 - 1) : 0)
- listPerBoard Fe = (Bn*o + Xa)/o

Competitor landed: landedPrice per competitor above, in competitors order
- cheapest C = min landed ; cheapestName

Final
- beatPrice Lt = C*(1 - beatCompetitorPct/100)
- autoBeat = beatCompetitor and Lt > v
- pricePerBoard p = autoBeat ? Lt : Fe
- subtotal = p*o + Xa ; gst = subtotal*gstPct/100 ; total = subtotal+gst
- profitPerBoard k = p - v ; marginPct = p>0 ? k/p*100 : 0 ; savings = C - p ; savingsPct = C>0 ? savings/C*100 : 0
- breakEvenBoards = (C*(1-beat)*P > K+w) ? ceil((oe+ke+max(Z,1)) / (C*(1-beat)*P - (K+w))) : null

Cost heads table (14): Bare PCB or Laminate (u ? Na : V), Process (u ? 0 : P_+wa), Drilling Cn, BOM+freight F, Consumables Fa, Testing W, Labour ee, Power te, Overheads ne, Packaging w, Bank+warranty xe+Re, Compliance Ha, Tooling+CAM re+G, Scrap Te. Share = amount/v*100.

## Reference output
Defaults with boardW 130, boardL 80, qty 275, 2 layers, Bare PCB, 1.6mm, 1oz, HASL-LF, Green, 6/6, 0.30, IPC-2, FlyingProbe, Standard, no specials:
pricePerBoard 73.11, total with GST 23725, cheapest competitor JLCPCB 76.96, savings 4 (5.0%).
