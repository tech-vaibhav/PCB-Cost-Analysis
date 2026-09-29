from math import ceil

from backend.models.pricing import AdminQuoteResponse, Overrides, PricingConfig, QuoteRequest, QuoteResponse
from backend.services.pricing.competitors import competitors
from backend.services.pricing.costs import bom_cost, costs
from backend.services.pricing.options import options_from_config
from backend.services.pricing.panel import panel


def validate(req: QuoteRequest, cfg: PricingConfig) -> None:
    for field, allowed in options_from_config(cfg).items():
        if field == "specials":
            if bad := set(req.specials) - set(allowed):
                raise ValueError(f"specials: unknown {', '.join(sorted(bad))}")
            continue
        value = getattr(req, field)
        if value not in allowed:
            raise ValueError(f"{field}: '{value}' is not a valid option")


def apply_overrides(cfg: PricingConfig, overrides: Overrides | None) -> PricingConfig:
    if not overrides:
        return cfg
    data = cfg.model_dump()
    data["rates"].update(overrides.rates)
    data["constants"].update(overrides.constants)
    return PricingConfig.model_validate(data)


def calculate_quote(req: QuoteRequest, cfg: PricingConfig) -> AdminQuoteResponse:
    validate(req, cfg)
    r, lk, k = cfg.rates, cfg.lookups, cfg.constants
    o = req.quantity
    pan = panel(req.boardW, req.boardL, r)
    asm = lk.orderTypes[req.orderType]
    comps = competitors(o, pan["boardArea"], lk.layerFactor[req.layers], asm, bom_cost(r, asm), cfg)
    bare = min((x for x in comps if x["isBareSource"]), key=lambda x: x["bare"])
    c = costs(req, cfg, pan["matArea"], bare["bare"])
    y, v, lf = c["y"], c["costPerBoard"], c["lf"]

    if r.markupOverridePct is not None:
        markup = r.markupOverridePct / 100
    else:
        markup = next((m for ceiling, m in lk.autoMarkup if o <= ceiling), r.markupBeyondTiersPct / 100)
    se = v * (1 + markup) * lk.expressFactor[req.express]
    bank, warranty = se * r.bankChargesPct / 100, se * r.warrantyPct / 100
    eng_extra = sum(lk.specialEngFee[s] for s, on in req.specials.items() if on)
    eng_fee = 0 if y else k.baseEngFee + eng_extra + (k.extraLayerFee * (float(req.layers) / 2 - 1) if lf > 1 else 0)
    list_price = ((se + bank + warranty) * o + eng_fee) / o

    cheapest = min(comps, key=lambda x: x["landed"])
    cl = cheapest["landed"]
    beat_price = cl * (1 - k.beatCompetitorPct / 100)
    auto_beat = r.beatCompetitor and beat_price > v
    p = beat_price if auto_beat else list_price
    subtotal = p * o + eng_fee
    gst = subtotal * k.gstPct / 100
    savings = cl - p

    unit_margin = beat_price * c["yield"] - (c["material"] + c["packaging"])
    monthly_fixed = c["overheadMonth"] + c["energyMonth"] + max(c["labourMonth"], 1)
    break_even = ceil(monthly_fixed / unit_margin) if unit_margin > 0 else None

    heads = [
        (f"Bare PCB ({bare['name']})" if c["u"] else "Laminate", c["outsourced"] if c["u"] else c["laminate"]),
        ("Process", 0 if c["u"] else c["process"] + c["special"]),
        ("Drilling", c["drilling"]),
        ("BOM + freight", c["bom"]),
        ("Consumables", 0 if y else c["consumables"]),
        ("Testing", 0 if y else c["testing"]),
        ("Labour", c["labour"]),
        ("Power", c["energy"]),
        ("Overheads", c["overhead"]),
        ("Packaging", c["packaging"]),
        ("Bank + warranty", bank + warranty),
        ("Compliance", c["compliance"]),
        ("Tooling + CAM", 0 if y else c["tooling"] + c["cam"]),
        ("Scrap", c["scrap"]),
    ]
    delivery = lk.deliveryText.get(req.express, "")
    f = pan["boardsPerPanel"]

    return AdminQuoteResponse(
        pricePerBoard=round(p, 2),
        quantity=o,
        engFee=round(eng_fee, 2),
        subtotal=round(subtotal, 2),
        gstPct=k.gstPct,
        gst=round(gst, 2),
        total=round(subtotal + gst, 2),
        delivery=delivery,
        panel={
            "boardsPerPanel": f, "perRow": pan["perRow"], "perCol": pan["perCol"],
            "utilizationPct": round(pan["utilizationPct"], 1),
            "panelsNeeded": ceil(c["produced"] / f) if f > 0 else 0,
        },
        summary={
            "Board": f"{req.boardW:g} x {req.boardL:g} mm",
            "Layers": req.layers,
            "Thickness": f"{req.thickness} mm",
            "Copper": f"{req.copper} oz",
            "Surface finish": req.finish,
            "Trace/space": f"{req.traceSpace} mil",
            "Min hole": f"{req.minHole} mm",
            "Solder mask": req.maskColor,
            "IPC class": req.ipcStd,
            "Testing": req.testing,
            "Production": req.express,
            "Special reqs": ", ".join(s for s, on in req.specials.items() if on) or "None",
            "Delivery": delivery,
        },
        costPerBoard=round(v, 2),
        orderCost=round(c["orderCost"], 2),
        listPerBoard=round(list_price, 2),
        pricingMode="auto-beat" if auto_beat else "markup",
        markupPct=round(markup * 100, 2),
        produced=round(c["produced"]),
        costHeads=[{"item": n, "amount": round(a, 2), "sharePct": round(a / v * 100, 1) if v else 0} for n, a in heads],
        profit={"perBoard": round(p - v, 2), "total": round((p - v) * o, 2), "marginPct": round((p - v) / p * 100, 1) if p > 0 else 0},
        competitors=[{**x, "bare": round(x["bare"], 2), "landed": round(x["landed"], 2),
                      "total": round(x["landed"] * o * (1 + k.gstPct / 100), 2)} for x in comps],
        cheapest={"name": cheapest["name"], "landed": round(cl, 2)},
        savings={"perBoard": round(savings, 2), "pct": round(savings / cl * 100, 1) if cl > 0 else 0},
        breakEvenBoards=break_even,
        monthly={"labour": round(c["labourMonth"], 2), "energy": round(c["energyMonth"], 2),
                 "overheads": round(c["overheadMonth"], 2), "kwh": round(c["kwh"], 2)},
    )


def public_quote(full: AdminQuoteResponse) -> QuoteResponse:
    return QuoteResponse.model_validate(full.model_dump())
