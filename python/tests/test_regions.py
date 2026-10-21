"""Unit tests for the territorial authority to climate zone lookup."""
import pytest

from h1.regions import climate_zone_for, territorial_authorities
from h1.tables import TableError


def test_the_table_covers_every_new_zealand_territorial_authority():
    authorities = territorial_authorities()

    assert len(authorities) == 69
    assert authorities == sorted(authorities)


@pytest.mark.parametrize(
    "authority, zone",
    [
        ("Auckland", 1),
        ("Far North District", 1),
        ("Wellington City", 3),
        ("Christchurch City", 5),
        ("Invercargill City", 6),
    ],
)
def test_known_councils_resolve_to_their_zone(authority, zone):
    assert climate_zone_for(authority) == zone


def test_lookup_ignores_case_and_surrounding_space():
    assert climate_zone_for("  auckland ") == climate_zone_for("Auckland")


def test_every_authority_lands_in_a_real_zone():
    assert {climate_zone_for(a) for a in territorial_authorities()} <= {1, 2, 3, 4, 5, 6}


def test_an_unknown_place_says_what_to_do_instead():
    with pytest.raises(TableError, match="not a New Zealand territorial authority"):
        climate_zone_for("Sydney")


def test_an_empty_authority_is_rejected():
    with pytest.raises(TableError, match="not a New Zealand territorial authority"):
        climate_zone_for("")
