"""Unit tests for the Part 1 scope checks.

These guard the failure mode the rest of the package cannot see: a building
H1/AS1 does not apply to still produces a tidy, compliant-looking calculation.
"""
import pytest

from h1.scope import (
    IN_SCOPE,
    NOT_STATED,
    OUT_OF_SCOPE,
    BuildingScope,
    check,
    out_of_scope,
    unanswered,
)

HOUSE = BuildingScope(
    non_housing_occupied_space_m2=0.0,
    has_curtain_walling=False,
    has_foil_insulation=False,
)


def by_rule(findings):
    return {f.rule: f for f in findings}


def test_a_plain_house_is_in_scope_on_every_rule():
    findings = check(HOUSE)

    assert {f.status for f in findings} == {IN_SCOPE}
    assert out_of_scope(findings) == []
    assert unanswered(findings) == []


def test_saying_nothing_is_not_the_same_as_saying_no():
    """Silence about curtain walling is not evidence there is none."""
    findings = check()

    assert {f.status for f in findings} == {NOT_STATED}
    assert len(unanswered(findings)) == 3
    assert out_of_scope(findings) == []


def test_check_with_no_argument_matches_an_empty_scope():
    assert check() == check(BuildingScope())


def test_housing_has_no_area_limit():
    """1.1.1.1 a) applies to housing of any size; only non-housing is capped."""
    findings = by_rule(check(BuildingScope(non_housing_occupied_space_m2=0.0)))

    assert findings["1.1.1.1 b)"].status == IN_SCOPE


@pytest.mark.parametrize("area, status", [(299.0, IN_SCOPE), (300.0, IN_SCOPE), (301.0, OUT_OF_SCOPE)])
def test_the_non_housing_limit_is_300_square_metres_inclusive(area, status):
    findings = by_rule(check(BuildingScope(non_housing_occupied_space_m2=area)))

    assert findings["1.1.1.1 b)"].status == status


def test_an_oversized_non_housing_building_is_pointed_at_as2():
    findings = by_rule(check(BuildingScope(non_housing_occupied_space_m2=450.0)))

    message = findings["1.1.1.1 b)"].message
    assert "H1/AS2" in message and "H1/VM2" in message


def test_curtain_walling_is_out_of_scope_and_points_at_vm1():
    findings = by_rule(check(BuildingScope(has_curtain_walling=True)))

    assert findings["1.1.2.2"].status == OUT_OF_SCOPE
    assert "H1/VM1" in findings["1.1.2.2"].message


def test_foil_insulation_is_out_of_scope_anywhere_in_the_building():
    findings = by_rule(check(BuildingScope(has_foil_insulation=True)))

    assert findings["1.1.2.1"].status == OUT_OF_SCOPE
    assert "anywhere in the" in findings["1.1.2.1"].message


def test_several_problems_are_all_reported_not_just_the_first():
    findings = check(
        BuildingScope(
            non_housing_occupied_space_m2=450.0,
            has_curtain_walling=True,
            has_foil_insulation=True,
        )
    )

    assert {f.rule for f in out_of_scope(findings)} == {"1.1.1.1 b)", "1.1.2.2", "1.1.2.1"}


def test_a_negative_area_is_rejected():
    with pytest.raises(ValueError, match="cannot be negative"):
        check(BuildingScope(non_housing_occupied_space_m2=-1.0))


def test_every_finding_cites_the_paragraph_it_comes_from():
    for finding in check(HOUSE) + check():
        assert finding.rule.startswith("1.1."), finding
        assert finding.message
