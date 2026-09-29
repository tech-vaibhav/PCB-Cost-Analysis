from backend.models.pricing import Constants, Lookups, PricingConfig, Rates

LOOKUP_CATEGORIES = {
    "layerFactor": "layer_factor", "thicknessFactor": "thickness_factor", "copperFactor": "copper_factor",
    "finishSurchargePct": "finish_surcharge_pct", "traceFactor": "trace_factor", "minHoleRs": "min_hole_inr",
    "maskColorRs": "mask_color_inr", "testingRs": "testing_inr", "ipcFactor": "ipc_factor",
}
FORM_OPTION_CATEGORIES = {"materialOptions": "material", "silkscreenOptions": "silkscreen"}
TABLES = ("pricing_rates", "pricing_policy", "option_factors", "delivery_speeds", "special_requirements",
          "markup_tiers", "form_options", "order_types", "competitors", "competitor_params")


def config_to_rows(cfg: PricingConfig, rate_rows: list[dict]) -> dict[str, list[dict]]:
    """Write payload. Rate rows come from the loaded rows so group_name, unit and unknown keys survive."""
    r, lk = cfg.rates, cfg.lookups
    vals = {**r.model_dump(), **cfg.constants.model_dump()}
    return {
        "pricing_rates": [{"key": x["key"], "group_name": x["group_name"], "unit": x["unit"],
                           "value": vals.get(x["key"], x["value"])} for x in rate_rows],
        "pricing_policy": [{"id": 1, "fab_source": r.fabSource, "beat_competitor": r.beatCompetitor,
                            "markup_override_pct": r.markupOverridePct}],
        "option_factors": [{"category": cat, "option": o, "value": v, "sort_order": i}
                           for f, cat in LOOKUP_CATEGORIES.items() for i, (o, v) in enumerate(getattr(lk, f).items())],
        "delivery_speeds": [{"speed": s, "price_factor": v, "delivery_text": lk.deliveryText.get(s, ""), "sort_order": i}
                            for i, (s, v) in enumerate(lk.expressFactor.items())],
        "special_requirements": [{"key": k, "surcharge_pct": v, "eng_fee_inr": lk.specialEngFee.get(k, 0), "sort_order": i}
                                 for i, (k, v) in enumerate(lk.specialPct.items())],
        "markup_tiers": [{"max_qty": q, "markup_pct": round(f * 100, 6)} for q, f in lk.autoMarkup],
        "form_options": [{"category": cat, "option": o, "sort_order": i}
                         for f, cat in FORM_OPTION_CATEGORIES.items() for i, o in enumerate(getattr(lk, f))],
        "order_types": [{"option": o, "is_assembly": a, "sort_order": i} for i, (o, a) in enumerate(lk.orderTypes.items())],
        "competitors": [{"name": c.name, "model": c.model, "note": c.note, "is_bare_source": c.isBareSource, "sort_order": i}
                        for i, c in enumerate(lk.competitors)],
        "competitor_params": [{"competitor": c.name, "param": k, "value": v} for c in lk.competitors for k, v in c.params.items()],
    }


def rows_to_config(rows: dict[str, list[dict]]) -> PricingConfig:
    s = lambda t: sorted(rows.get(t, []), key=lambda x: x.get("sort_order", 0))
    vals = {x["key"]: x["value"] for x in rows["pricing_rates"]}
    p = rows["pricing_policy"][0]
    speeds, specials = s("delivery_speeds"), s("special_requirements")
    lookups = {f: {x["option"]: x["value"] for x in s("option_factors") if x["category"] == cat}
               for f, cat in LOOKUP_CATEGORIES.items()}
    lookups |= {f: [x["option"] for x in s("form_options") if x["category"] == cat]
                for f, cat in FORM_OPTION_CATEGORIES.items()}
    return PricingConfig(
        rates=Rates(**vals, fabSource=p["fab_source"], beatCompetitor=p["beat_competitor"],
                    markupOverridePct=p["markup_override_pct"]),
        lookups=Lookups(**lookups,
                        orderTypes={x["option"]: x["is_assembly"] for x in s("order_types")},
                        competitors=[{"name": x["name"], "model": x["model"], "note": x["note"], "isBareSource": x["is_bare_source"],
                                      "params": {p["param"]: p["value"] for p in rows["competitor_params"] if p["competitor"] == x["name"]}}
                                     for x in s("competitors")],
                        expressFactor={x["speed"]: x["price_factor"] for x in speeds},
                        deliveryText={x["speed"]: x["delivery_text"] for x in speeds},
                        specialPct={x["key"]: x["surcharge_pct"] for x in specials},
                        specialEngFee={x["key"]: x["eng_fee_inr"] for x in specials},
                        autoMarkup=[(x["max_qty"], round(float(x["markup_pct"]) / 100, 6))
                                    for x in sorted(rows["markup_tiers"], key=lambda x: x["max_qty"])]),
        constants=Constants(**vals),
    )
