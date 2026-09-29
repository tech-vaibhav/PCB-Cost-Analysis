from typing import Literal

from pydantic import BaseModel, Field


class Rates(BaseModel):
    panelW: float
    panelL: float
    routingGap: float
    edgeMargin: float
    yieldPct: float
    workDays: float
    shifts: float
    lamRate: float
    procRate: float
    bom: float
    solderPaste: float
    consumables: float
    compWastagePct: float
    drillRouterWear: float
    compFreightPct: float
    tooling: float
    opsPerShift: float
    opSalary: float
    qcSalary: float
    supervisorSalary: float
    benefitsPct: float
    reworkPct: float
    camTimeHrs: float
    loadKw: float
    runHours: float
    utilPct: float
    tariff: float
    lighting: float
    nitrogen: float
    waterEffluent: float
    rent: float
    admin: float
    marketing: float
    software: float
    maintenance: float
    insurance: float
    interest: float
    misc: float
    depreciation: float
    esdBag: float
    cartonPacking: float
    shipping: float
    bankChargesPct: float
    warrantyPct: float
    compliance: float
    ohAllocPct: float
    markupBeyondTiersPct: float
    bareConsumablesSharePct: float
    barePackagingSharePct: float
    outsourceLabourSharePct: float
    outsourceEnergySharePct: float
    markupOverridePct: float | None = ...
    beatCompetitor: bool
    fabSource: Literal["outsource", "inhouse"]


class Competitor(BaseModel):
    name: str
    model: Literal["usd_import", "inr_domestic"]
    note: str
    isBareSource: bool
    params: dict[str, float]


class Lookups(BaseModel):
    orderTypes: dict[str, bool]
    layerFactor: dict[str, float]
    thicknessFactor: dict[str, float]
    copperFactor: dict[str, float]
    finishSurchargePct: dict[str, float]
    traceFactor: dict[str, float]
    minHoleRs: dict[str, float]
    maskColorRs: dict[str, float]
    testingRs: dict[str, float]
    expressFactor: dict[str, float]
    deliveryText: dict[str, str]
    ipcFactor: dict[str, float]
    specialPct: dict[str, float]
    specialEngFee: dict[str, float]
    autoMarkup: list[tuple[int, float]]
    materialOptions: list[str]
    silkscreenOptions: list[str]
    competitors: list[Competitor]


class Constants(BaseModel):
    usdInr: float
    gstPct: float
    landedFactor: float
    importDutyPct: float
    baseEngFee: float
    extraLayerFee: float
    beatCompetitorPct: float
    camHoursPerMonth: float


class PricingConfig(BaseModel):
    rates: Rates
    lookups: Lookups
    constants: Constants


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
    specials: dict[str, bool] = {}


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


class CompetitorQuote(BaseModel):
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
    competitors: list[CompetitorQuote]
    cheapest: Cheapest
    savings: Savings
    breakEvenBoards: int | None
    monthly: Monthly
