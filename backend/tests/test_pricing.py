import pytest

from backend.models.pricing import QuoteRequest
from backend.services.pricing.options import options_from_config
from backend.services.pricing.quote import calculate_quote, public_quote

REF = dict(
    boardW=130, boardL=80, quantity=275, layers="2", orderType="Bare PCB", thickness="1.6", copper="1",
    material="FR4 TG130", maskColor="Green", silkscreen="White", finish="HASL-LF", traceSpace="6/6",
    minHole="0.30", ipcStd="IPC-2", testing="FlyingProbe", express="Standard",
)


def test_reference(config):
    q = calculate_quote(QuoteRequest(**REF), config)
    assert q.pricePerBoard == 73.11
    assert abs(q.total - 23725) <= 1
    assert q.cheapest.name == "JLCPCB"
    assert abs(q.cheapest.landed - 76.96) <= 0.01
    assert round(q.savings.perBoard) == 4
    assert abs(q.savings.pct - 5.0) <= 0.05
    assert q.pricingMode == "auto-beat"
    assert abs(sum(h.amount for h in q.costHeads if h.item != "Bank + warranty") - q.costPerBoard) <= 0.05


def test_inhouse_pcba(config):
    cfg = config.model_copy(deep=True)
    cfg.rates.fabSource = "inhouse"
    q = calculate_quote(QuoteRequest(**{**REF, "orderType": "PCBA"}), cfg)
    heads = {h.item: h.amount for h in q.costHeads}
    assert all(a >= 0 for a in heads.values())
    assert q.costPerBoard > 0
    assert q.engFee == 1000
    assert heads["Laminate"] > 0 and heads["Process"] > 0


def test_invalid_option(config):
    with pytest.raises(ValueError, match="layers"):
        calculate_quote(QuoteRequest(**{**REF, "layers": "3"}), config)


def test_public_quote_hides_admin_fields(config):
    out = public_quote(calculate_quote(QuoteRequest(**REF), config)).model_dump()
    assert "costPerBoard" not in out and "competitors" not in out


def test_options(config):
    assert options_from_config(config)["layers"] == ["1", "2", "4", "6", "8"]


def test_competitors_match_old_formulas(config):
    q = calculate_quote(QuoteRequest(**REF), config)
    assert [(c.name, c.bare, c.landed) for c in q.competitors] == [
        ("JLCPCB", 60.04, 76.96), ("PCBWay", 87.82, 112.79), ("JPCPCB", 87.35, 133.83), ("Megabyte", 62.0, 80.6)]


def test_order_types(config):
    assert config.lookups.orderTypes["Bare PCB"] is False and config.lookups.orderTypes["PCBA"] is True
    assert options_from_config(config)["orderType"] == ["Bare PCB", "PCBA", "Assembly Only"]


def test_specials(config):
    with pytest.raises(ValueError, match="specials"):
        calculate_quote(QuoteRequest(**REF, specials={"bogus": True}), config)
    q = calculate_quote(QuoteRequest(**REF, specials={"impedance": True}), config)
    assert q.summary["Special reqs"] == "impedance"
