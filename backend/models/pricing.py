from typing import Literal

from pydantic import BaseModel, Field


class Rates(BaseModel):
    panelW: float = 250
    panelL: float = 250
    routingGap: float = 5
    edgeMargin: float = 10
    yieldPct: float = 94
    workDays: float = 26
    shifts: float = 1
    lamRate: float = 1600
    procRate: float = 900
    bom: float = 80
    solderPaste: float = 8
    consumables: float = 12
    compWastagePct: float = 2
    drillRouterWear: float = 3
    compFreightPct: float = 3
    tooling: float = 15000
    opsPerShift: float = 1
    opSalary: float = 18000
    qcSalary: float = 0
    supervisorSalary: float = 0
    benefitsPct: float = 18
    reworkPct: float = 5
    camTimeHrs: float = 2
    loadKw: float = 15
    runHours: float = 8
    utilPct: float = 60
    tariff: float = 8.5
    lighting: float = 5000
    nitrogen: float = 2000
    waterEffluent: float = 2000
    rent: float = 15000
    admin: float = 10000
    marketing: float = 5000
    software: float = 3000
    maintenance: float = 3000
    insurance: float = 2000
    interest: float = 5000
    misc: float = 3000
    depreciation: float = 8000
    esdBag: float = 2.5
    cartonPacking: float = 1.5
    shipping: float = 5
    bankChargesPct: float = 0.5
    warrantyPct: float = 1
    compliance: float = 500
    ohAllocPct: float = 15
    markupOverridePct: float | None = 10
    beatCompetitor: bool = True
    fabSource: Literal["outsource", "inhouse"] = "outsource"


class Lookups(BaseModel):
    layerFactor: dict[str, float] = {"1": 0.7, "2": 1, "4": 1.8, "6": 2.6, "8": 3.4}
    thicknessFactor: dict[str, float] = {"0.6": 0.85, "0.8": 0.9, "1.0": 0.95, "1.2": 1, "1.6": 1.1, "2.0": 1.25, "2.4": 1.4, "3.2": 1.6}
    copperFactor: dict[str, float] = {"0.5": 0.95, "1": 1, "1.5": 1.15, "2": 1.35, "3": 1.7, "4": 2.2}
    finishSurchargePct: dict[str, float] = {"HASL": 0, "HASL-LF": 8, "ENIG-1": 20, "ENIG-2": 28, "ENIG-3": 35, "ImmTin": 12, "ImmSilver": 15, "OSP": -5}
    traceFactor: dict[str, float] = {"6/6": 1, "5/5": 1.1, "4/4": 1.25, "3/3": 1.5}
    minHoleRs: dict[str, float] = {"0.40": 0, "0.30": 3, "0.25": 8, "0.20": 15, "0.15": 25}
    maskColorRs: dict[str, float] = {"Green": 0, "Blue": 2, "Red": 2, "Black": 3, "White": 3, "Yellow": 2, "Purple": 5}
    testingRs: dict[str, float] = {"FlyingProbe": 3, "Fixture": 8, "None": 0}
    expressFactor: dict[str, float] = {"Standard": 1, "Urgent": 1.5}
    deliveryText: dict[str, str] = {"Standard": "7-10 working days", "Urgent": "3-5 working days"}
    ipcFactor: dict[str, float] = {"IPC-2": 1, "IPC-3": 1.15}
    specialPct: dict[str, float] = {"impedance": 12, "blindVias": 25, "goldFingers": 10, "halfHole": 8, "resinPlug": 10, "metalEdge": 15, "halogenFree": 8}
    specialEngFee: dict[str, float] = {"impedance": 1000, "blindVias": 2000, "goldFingers": 500, "halfHole": 500, "resinPlug": 500, "metalEdge": 500, "halogenFree": 500}
    autoMarkup: list[tuple[int, float]] = [(5, 1.0), (10, 0.9), (20, 0.8), (50, 0.72), (100, 0.65), (300, 0.58), (500, 0.5), (1000, 0.42), (2000, 0.35)]
    materialOptions: list[str] = ["FR4 TG130", "FR4 TG150", "FR4 TG170", "High-Freq", "Aluminum"]
    silkscreenOptions: list[str] = ["White", "Black", "Yellow", "None"]


class Constants(BaseModel):
    usdInr: float = 88
    gstPct: float = 18
    landedFactor: float = 1.3
    importDutyPct: float = 10
    baseEngFee: float = 1000
    extraLayerFee: float = 500
    beatCompetitorPct: float = 5
    camHoursPerMonth: float = 160


class PricingConfig(BaseModel):
    rates: Rates = Field(default_factory=Rates)
    lookups: Lookups = Field(default_factory=Lookups)
    constants: Constants = Field(default_factory=Constants)


class Specials(BaseModel):
    impedance: bool = False
    blindVias: bool = False
    goldFingers: bool = False
    halfHole: bool = False
    resinPlug: bool = False
    metalEdge: bool = False
    halogenFree: bool = False


class QuoteRequest(BaseModel):
    boardW: float = Field(gt=0)
    boardL: float = Field(gt=0)
    quantity: int = Field(ge=1)
    layers: str
    orderType: str
    thickness: str
    copper: str
    material: str
    maskColor: str
    silkscreen: str
    finish: str
    traceSpace: str
    minHole: str
    ipcStd: str
    testing: str
    express: str
    specials: Specials = Field(default_factory=Specials)


class Overrides(BaseModel):
    rates: dict = {}
    constants: dict = {}


class AdminQuoteRequest(QuoteRequest):
    overrides: Overrides | None = None


class Panel(BaseModel):
    boardsPerPanel: int
    perRow: int
    perCol: int
    utilizationPct: float
    panelsNeeded: int


class QuoteResponse(BaseModel):
    pricePerBoard: float
    quantity: int
    engFee: float
    subtotal: float
    gstPct: float
    gst: float
    total: float
    delivery: str
    panel: Panel
    summary: dict[str, str]


class CostHead(BaseModel):
    item: str
    amount: float
    sharePct: float


class Profit(BaseModel):
    perBoard: float
    total: float
    marginPct: float


class Competitor(BaseModel):
    name: str
    bare: float
    landed: float
    total: float
    note: str


class Cheapest(BaseModel):
    name: str
    landed: float


class Savings(BaseModel):
    perBoard: float
    pct: float


class Monthly(BaseModel):
    labour: float
    energy: float
    overheads: float
    kwh: float


class AdminQuoteResponse(QuoteResponse):
    costPerBoard: float
    orderCost: float
    listPerBoard: float
    pricingMode: Literal["auto-beat", "markup"]
    markupPct: float
    produced: int
    costHeads: list[CostHead]
    profit: Profit
    competitors: list[Competitor]
    cheapest: Cheapest
    savings: Savings
    breakEvenBoards: int | None
    monthly: Monthly
