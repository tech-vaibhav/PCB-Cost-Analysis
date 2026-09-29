from backend.models.pricing import PricingConfig


def usd_import(p, o, h, lf, asm, bom, usd, duty, landed):
    base = max(p["per_board_fixed_usd"] / min(o, p["min_qty_cap"]), p["per_board_floor_usd"]) + h * p["area_rate_usd_per_m2"] * lf
    fee = p["order_fee_usd"] + min(o * p["order_fee_per_board_usd"], p["order_fee_cap_usd"])
    a = max(p["asm_floor_usd"], p["asm_base_usd"] + h * p["asm_area_rate_usd_per_m2"]) if asm else 0
    kt = (base + a) * o
    return ((base * o + fee) * usd * (1 + p["freight_pct"] / 100) / o,
            ((kt + fee) * usd + kt * usd * duty + bom * o) / o * landed)


def inr_domestic(p, o, h, lf, asm, bom, usd, duty, landed):
    lfx = lf + (p["multilayer_extra"] if lf > 1 else 0)
    fixed = max(p["per_board_fixed_inr"] / min(o, p["min_qty_cap"]), p["per_board_floor_inr"]) * (lfx if p["fixed_scales_with_layers"] else 1)
    fee = p["order_fee_inr"] + min(o * p["order_fee_per_board_inr"], p["order_fee_cap_inr"])
    a = max(p["asm_floor_inr"], p["asm_base_inr"] + h * p["asm_area_rate_inr_per_m2"]) if asm else 0
    return (fixed + h * p["area_rate_inr_per_m2"] * lfx + fee / o,
            ((fixed + h * p["area_rate_landed_inr_per_m2"] * lfx + a) * o + fee + bom * o) / o * landed)


MODELS = {"usd_import": usd_import, "inr_domestic": inr_domestic}


def competitors(o: int, h: float, lf: float, asm: bool, bom: float, cfg: PricingConfig) -> list[dict]:
    k = cfg.constants
    out = []
    for c in cfg.lookups.competitors:
        bare, landed = MODELS[c.model](c.params, o, h, lf, asm, bom, k.usdInr, k.importDutyPct / 100, k.landedFactor)
        out.append({"name": c.name, "bare": bare, "landed": landed, "note": c.note, "isBareSource": c.isBareSource})
    return out
