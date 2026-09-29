import pytest

from backend.models.pricing import QuoteRequest
from backend.services.pricing.defaults import DEFAULT_CONFIG
from backend.services.pricing.options import options_from_config
from backend.services.pricing.quote import calculate_quote, public_quote

REF = dict(
    boardW=130, boardL=80, quantity=275, layers="2", orderType="Bare PCB", thickness="1.6", copper="1",
    material="FR4 TG130", maskColor="Green", silkscreen="White", finish="HASL-LF", traceSpace="6/6",
    minHole="0.30", ipcStd="IPC-2", testing="FlyingProbe", express="Standard",
)


def test_reference():
    q = calculate_quote(QuoteRequest(**REF), DEFAULT_CONFIG)
    assert q.pricePerBoard == 73.11
    assert abs(q.total - 23725) <= 1
    assert q.cheapest.name == "JLCPCB"
    assert abs(q.cheapest.landed - 76.96) <= 0.01
    assert round(q.savings.perBoard) == 4
    assert abs(q.savings.pct - 5.0) <= 0.05
    assert q.pricingMode == "auto-beat"
    assert abs(sum(h.amount for h in q.costHeads if h.item != "Bank + warranty") - q.costPerBoard) <= 0.05


def test_inhouse_pcba():
    cfg = DEFAULT_CONFIG.model_copy(deep=True)
    cfg.rates.fabSource = "inhouse"
    q = calculate_quote(QuoteRequest(**{**REF, "orderType": "PCBA"}), cfg)
    heads = {h.item: h.amount for h in q.costHeads}
    assert all(a >= 0 for a in heads.values())
    assert q.costPerBoard > 0
    assert q.engFee == 1000
    assert heads["Laminate"] > 0 and heads["Process"] > 0


def test_invalid_option():
    with pytest.raises(ValueError, match="layers"):
        calculate_quote(QuoteRequest(**{**REF, "layers": "3"}), DEFAULT_CONFIG)


def test_public_quote_hides_admin_fields():
    out = public_quote(calculate_quote(QuoteRequest(**REF), DEFAULT_CONFIG)).model_dump()
    assert "costPerBoard" not in out and "competitors" not in out


def test_options():
    assert options_from_config(DEFAULT_CONFIG)["layers"] == ["1", "2", "4", "6", "8"]
