from backend.models.pricing import PricingConfig

def options_from_config(cfg: PricingConfig) -> dict:
    lk = cfg.lookups
    return {
        "orderType": list(lk.orderTypes),
        "layers": list(lk.layerFactor),
        "thickness": list(lk.thicknessFactor),
        "copper": list(lk.copperFactor),
        "material": list(lk.materialOptions),
        "maskColor": list(lk.maskColorRs),
        "silkscreen": list(lk.silkscreenOptions),
        "finish": list(lk.finishSurchargePct),
        "traceSpace": list(lk.traceFactor),
        "minHole": list(lk.minHoleRs),
        "ipcStd": list(lk.ipcFactor),
        "testing": list(lk.testingRs),
        "express": list(lk.expressFactor),
        "specials": list(lk.specialPct),
    }
