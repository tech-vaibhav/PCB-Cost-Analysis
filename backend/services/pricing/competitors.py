from backend.models.pricing import PricingConfig


def competitors(o: int, h: float, lf: float, asm: bool, bom: float, cfg: PricingConfig) -> list[dict]:
    c = cfg.constants
    usd, landed, duty = c.usdInr, c.landedFactor, c.importDutyPct / 100

    za = max(2 / min(o, 5), 0.08) + h * 12 * lf
    bt = 18 + min(o * 0.03, 15)
    ft = za * 1.5
    st = 22 + min(o * 0.04, 18)
    yt = max(0.48, 0.15 + h * 80) if asm else 0
    kt = (za + yt) * o
    tt = (ft + yt * 1.3) * o
    jlc_landed = ((kt + bt) * usd + kt * usd * duty + bom * o) / o * landed
    pcbway_landed = ((tt + st) * usd + tt * usd * duty + bom * o) / o * landed

    jpc_fixed = 200 + min(o * 2, 500)
    jpc_bare = ((max(80 / min(o, 10), 12) + h * 7000 * lf) * o + jpc_fixed) / o
    kn = max(80 / min(o, 10), 12) + h * 8500 * lf
    mn = max(15, 5 + h * 5000) if asm else 0
    jpc_landed = ((kn + mn) * o + jpc_fixed + bom * o) / o * landed

    mega = (max(50 / min(o, 10), 8) + h * 5000) * (lf + (0.8 if lf > 1 else 0))
    xn = max(12, 4 + h * 4000) if asm else 0
    wt = 150 + min(o * 1.5, 400)
    mega_landed = ((mega + xn) * o + wt + bom * o) / o * landed

    china = f"China + DHL + {c.importDutyPct:g}% duty"
    return [
        {"name": "JLCPCB", "bare": (za * o + bt) * usd * 1.1 / o, "landed": jlc_landed, "note": china},
        {"name": "PCBWay", "bare": (ft * o + st) * usd * 1.1 / o, "landed": pcbway_landed, "note": china},
        {"name": "JPCPCB", "bare": jpc_bare, "landed": jpc_landed, "note": "India domestic"},
        {"name": "Megabyte", "bare": mega + wt / o, "landed": mega_landed, "note": "India domestic"},
    ]
