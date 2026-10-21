"""Tests for the roofing choice → substrate and underlay linkage."""
import copy

import pytest
import yaml

from h1.rvalue import roofing
from h1.rvalue.engine import RValueError

SYSTEMS = roofing.load()
PLY = "CHH Ecoply Roof Ply 15 mm DD T&G"


def raw():
    return copy.deepcopy(yaml.safe_load(roofing.DATA_FILE.read_text(encoding="utf-8")))


@pytest.mark.parametrize("profile", ["corrugate", "trapezoidal"])
def test_longrun_roofing_brings_roof_paper_over_purlins(profile):
    family = SYSTEMS.family_for_profile(profile)

    assert family.id == "longrun"
    assert (family.underlay.default, family.substrate.default) == ("roof_paper", "purlins")


def test_shingle_roofing_brings_d226_on_ecoply():
    family = SYSTEMS.family_for_profile("asphalt_shingle")

    assert family.underlay.allowed == ("d226_plus",)
    assert family.substrate.allowed == ("ecoply_roof_ply_15",)
    assert SYSTEMS.substrates[family.substrate.default] == PLY


@pytest.mark.parametrize("profile, substrate, underlay", [
    ("corrugate", "purlins", "roof_paper"),
    ("asphalt_shingle", "ecoply_roof_ply_15", "d226_plus"),
])
def test_consistent_selections_have_no_problems(profile, substrate, underlay):
    assert roofing.check(SYSTEMS, profile, substrate, underlay) == []


def test_ply_under_longrun_is_flagged():
    problems = roofing.check(SYSTEMS, "corrugate", "ecoply_roof_ply_15", "roof_paper")

    assert problems == [f"Longrun metal roofing takes Purlins as the substrate, not {PLY}."]


def test_shingles_on_purlins_with_roof_paper_are_flagged_twice():
    problems = roofing.check(SYSTEMS, "asphalt_shingle", "purlins", "roof_paper")

    assert problems == [
        f"Shingle roofing takes {PLY} as the substrate, not Purlins.",
        "Shingle roofing takes D226+ roofing underlay as the underlay, not Roof paper.",
    ]


def test_tile_roofing_is_not_offered_yet():
    assert set(SYSTEMS.families) == {"longrun", "shingle"}
    with pytest.raises(RValueError, match="Unknown roofing profile"):
        SYSTEMS.family_for_profile("concrete_tile")


def test_an_unconfirmed_layer_is_reported_rather_than_filled_in():
    """When a family is added before its rules are known, nothing gets guessed."""
    data = raw()
    data["families"]["shingle"]["underlay"] = {"confirmed": False, "default": None, "allowed": []}

    problems = roofing.check(roofing.parse(data), "asphalt_shingle", "ecoply_roof_ply_15", None)

    assert problems == [
        "No underlay rule is set up for shingle roofing yet — choose it yourself and "
        "check it against the manufacturer's details."
    ]


def test_a_confirmed_layer_needs_a_default_it_allows():
    data = raw()
    data["families"]["longrun"]["underlay"]["default"] = None

    with pytest.raises(RValueError, match="needs a default that is in `allowed`"):
        roofing.parse(data)


def test_an_unconfirmed_layer_cannot_smuggle_in_a_default():
    data = raw()
    data["families"]["shingle"]["underlay"]["confirmed"] = False

    with pytest.raises(RValueError, match="must not carry a default"):
        roofing.parse(data)


def test_allowed_options_must_exist():
    data = raw()
    data["families"]["longrun"]["substrate"]["allowed"] = ["purlins", "sarking"]

    with pytest.raises(RValueError, match="not defined under substrates"):
        roofing.parse(data)


def test_a_profile_cannot_belong_to_two_families():
    data = raw()
    data["families"]["shingle"]["profiles"]["corrugate"] = "Corrugate"

    with pytest.raises(RValueError, match="listed under both"):
        roofing.parse(data)
