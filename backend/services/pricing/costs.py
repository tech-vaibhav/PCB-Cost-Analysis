from backend.models.pricing import PricingConfig, QuoteRequest


def bom_cost(r, asm: bool) -> float:
    return r.bom * (1 + r.compWastagePct / 100) * (1 + r.compFreightPct / 100) if asm else 0


def costs(req: QuoteRequest, cfg: PricingConfig, mat_area: float, outsourced: float) -> dict:
    r, lk = cfg.rates, cfg.lookups
    o = req.quantity
    asm = lk.orderTypes[req.orderType]
    u = r.fabSource == "outsource"
    y = u and not asm
    lf = lk.layerFactor[req.layers]
    special_pct = sum(lk.specialPct[k] for k, on in req.specials.items() if on)

    lam = 0 if u else mat_area * r.lamRate * lf * lk.thicknessFactor[req.thickness] * lk.copperFactor[req.copper]
    proc = 0 if u else (mat_area * r.procRate * lf * (1 + lk.finishSurchargePct[req.finish] / 100)
                        * lk.traceFactor[req.traceSpace] * lk.ipcFactor[req.ipcStd])
    bom = bom_cost(r, asm)
    cons = (r.solderPaste + r.consumables + (0 if u else r.drillRouterWear + lk.maskColorRs[req.maskColor])) * (1 if asm else r.bareConsumablesSharePct / 100)
    special = 0 if u else (lam + proc) * special_pct / 100
    drill = 0 if u else lk.minHoleRs[req.minHole]
    test = lk.testingRs[req.testing]
    na = outsourced if u else 0
    material = na if y else lam + proc + na + bom + cons + special + drill + test

    yf = min(max(r.yieldPct, 1), 100) / 100
    g = o if y else o / yf
    oa = r.ohAllocPct / 100

    labour_base = r.opsPerShift * r.shifts * r.opSalary + (r.qcSalary + r.supervisorSalary) * r.shifts
    labour_month = labour_base * (1 + r.benefitsPct / 100)
    labour = 0 if y or g <= 0 else labour_month * oa / g * (1 + r.reworkPct / 100) * (r.outsourceLabourSharePct / 100 if u else 1)
    cam_order = r.camTimeHrs * r.supervisorSalary / cfg.constants.camHoursPerMonth

    kwh = r.loadKw * r.workDays * r.shifts * r.runHours * r.utilPct / 100
    energy_month = kwh * r.tariff + r.lighting + r.nitrogen + r.waterEffluent
    energy = 0 if y or g <= 0 else energy_month * oa / g * (r.outsourceEnergySharePct / 100 if u else 1)

    overhead_month = (r.rent + r.admin + r.marketing + r.software + r.maintenance
                      + r.insurance + r.interest + r.misc + r.depreciation)
    overhead = 0 if y or g <= 0 else overhead_month * oa / g

    ps = r.barePackagingSharePct / 100
    pack = r.esdBag * ps if y else (r.esdBag + r.cartonPacking + r.shipping if asm else (r.esdBag + r.shipping) * ps)

    base = material + labour + energy + overhead + pack
    scrap = 0 if y else base * (1 - yf) / yf
    order_cost = base * g + (0 if u else r.tooling + cam_order) + r.compliance

    return {
        "u": u, "y": y, "lf": lf, "yield": yf, "produced": g,
        "laminate": lam, "process": proc, "bom": bom, "consumables": cons, "special": special,
        "drilling": drill, "testing": test, "outsourced": na, "material": material,
        "labour": labour, "energy": energy, "overhead": overhead, "packaging": pack, "scrap": scrap,
        "tooling": r.tooling / o, "cam": cam_order / o, "compliance": r.compliance / o,
        "orderCost": order_cost, "costPerBoard": order_cost / o,
        "labourMonth": labour_month, "energyMonth": energy_month, "overheadMonth": overhead_month, "kwh": kwh,
    }
