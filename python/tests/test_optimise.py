"""Unit tests for the H1 build-up optimiser.

The load-bearing test here is `test_matches_exhaustive_brute_force`. Branch and
bound is only worth having if it provably cuts nothing it should have kept, so
the pruned search is checked against a full enumeration that uses the engine for
every verdict.
"""
import itertools

import pytest

from h1 import catalogue as catalogue_module
from h1 import engine
from h1 import tables as tables_module
from h1.optimise import Assembly, optimise
from h1.tables import TableError

TABLES = tables_module.load()

ASSEMBLIES = [
    Assembly("ceiling", "roof", 100.0),
    Assembly("external wall", "wall", 80.0),
    Assembly("joinery", "glazing", 20.0),
    Assembly("entry door", "opaque_door", 4.0),
    Assembly("slab", "slab_on_ground_floor", 100.0),
]

RAW_CATALOGUE = {
    "currency": "NZD",
    "verified": True,
    "options": {
        "wall": [
            {"name": "90mm stud", "r_value": 1.8, "cost_per_m2": 80,
             "tags": ["standard-stud", "weatherboard"]},
            {"name": "140mm stud", "r_value": 2.6, "cost_per_m2": 120,
             "tags": ["deep-stud", "weatherboard"]},
            {"name": "90mm stud, brick veneer", "r_value": 1.9, "cost_per_m2": 165,
             "tags": ["standard-stud", "brick-veneer"]},
            {"name": "90mm + external PIR", "r_value": 3.3, "cost_per_m2": 210,
             "tags": ["standard-stud", "external-insulation"]},
        ],
        "roof": [
            {"name": "R3.6 ceiling", "r_value": 3.6, "cost_per_m2": 40, "tags": ["truss"]},
            {"name": "R6.6 ceiling", "r_value": 6.6, "cost_per_m2": 60, "tags": ["truss"]},
            {"name": "R8.0 ceiling", "r_value": 8.0, "cost_per_m2": 95, "tags": ["truss"]},
        ],
        "glazing": [
            {"name": "standard double", "r_value": 0.26, "cost_per_m2": 450, "tags": ["aluminium"]},
            {"name": "thermally broken", "r_value": 0.37, "cost_per_m2": 650,
             "tags": ["aluminium", "thermally-broken"]},
            {"name": "low-E argon", "r_value": 0.46, "cost_per_m2": 900,
             "tags": ["aluminium", "thermally-broken", "low-e"]},
        ],
        "slab_on_ground_floor": [
            {"name": "uninsulated slab", "r_value": 1.3, "cost_per_m2": 150,
             "tags": ["conventional-slab"]},
            {"name": "perimeter insulated", "r_value": 1.6, "cost_per_m2": 190,
             "tags": ["conventional-slab"]},
            {"name": "insulated raft", "r_value": 2.5, "cost_per_m2": 260, "tags": ["raft-slab"]},
        ],
        "opaque_door": [
            {"name": "solid core", "r_value": 0.45, "cost_per_m2": 700, "tags": []},
        ],
    },
}


def catalogue(**overrides):
    return catalogue_module.parse({**RAW_CATALOGUE, **overrides})


def with_options(element_type, entries):
    return catalogue(options={**RAW_CATALOGUE["options"], element_type: entries})


def options_for(assembly, cat, exclude_tags=()):
    """The same tag filtering the optimiser applies, for an independent enumeration."""
    excluded = tuple(exclude_tags) + tuple(assembly.exclude_tags)
    options = cat.for_type(assembly.element_type, excluded)
    if assembly.require_tags:
        wanted = set(assembly.require_tags)
        options = [o for o in options if wanted.issubset(o.tags)]
    return [o for o in options if o.cost_per_m2 is not None]


def brute_force(assemblies, zone, cat, exclude_tags=()):
    """Every combination, verdict from the engine, ranked by cost. No pruning."""
    choices = [options_for(a, cat, exclude_tags) for a in assemblies]
    passing = []
    for combo in itertools.product(*choices):
        elements = [
            engine.Element(a.element_type, a.area_m2, o.r_value, a.name, a.heated)
            for a, o in zip(assemblies, combo)
        ]
        if engine.calculate(elements, zone, TABLES).complies:
            cost = sum(a.area_m2 * o.cost_per_m2 for a, o in zip(assemblies, combo))
            passing.append((cost, {a.name: o.name for a, o in zip(assemblies, combo)}))
    return sorted(passing, key=lambda pair: pair[0])


def names(candidate):
    return {s.assembly: s.name for s in candidate.selections}


def as_set(pairs):
    """Cost-ranking says nothing about the order of equally priced answers."""
    return {(round(cost, 6), frozenset(selection.items())) for cost, selection in pairs}


def test_matches_exhaustive_brute_force():
    expected = brute_force(ASSEMBLIES, 1, catalogue())

    solutions = optimise(ASSEMBLIES, 1, TABLES, catalogue(), limit=len(expected))

    assert len(solutions.candidates) == len(expected)
    assert as_set((c.total_cost, names(c)) for c in solutions.candidates) == as_set(expected)


def test_the_first_candidate_is_the_cheapest_compliant_specification():
    cheapest_cost, cheapest_selection = brute_force(ASSEMBLIES, 1, catalogue())[0]

    solutions = optimise(ASSEMBLIES, 1, TABLES, catalogue(), limit=1)

    assert solutions.candidates[0].total_cost == pytest.approx(cheapest_cost)
    assert names(solutions.candidates[0]) == cheapest_selection


def test_every_candidate_returned_actually_complies():
    solutions = optimise(ASSEMBLIES, 1, TABLES, catalogue(), limit=25)

    assert solutions.candidates
    for candidate in solutions.candidates:
        assert candidate.result.complies is True
        assert candidate.heat_loss <= solutions.budget_heat_loss + 1e-9


def test_candidates_come_back_cheapest_first():
    solutions = optimise(ASSEMBLIES, 1, TABLES, catalogue(), limit=25)

    costs = [c.total_cost for c in solutions.candidates]
    assert costs == sorted(costs)


# ── several build-ups on one element type ───────────────────────────────────

MIXED_WALLS = [
    Assembly("ceiling", "roof", 100.0),
    Assembly("street elevation", "wall", 30.0, require_tags=("brick-veneer",)),
    Assembly("other walls", "wall", 50.0, require_tags=("weatherboard",)),
    Assembly("joinery", "glazing", 20.0),
    Assembly("entry door", "opaque_door", 4.0),
    Assembly("slab", "slab_on_ground_floor", 100.0),
]


def test_two_wall_assemblies_are_specified_independently():
    solutions = optimise(MIXED_WALLS, 1, TABLES, catalogue(), limit=1)

    chosen = names(solutions.candidates[0])
    assert "brick-veneer" in _tags(solutions.candidates[0], "street elevation")
    assert "weatherboard" in _tags(solutions.candidates[0], "other walls")
    assert chosen["street elevation"] != chosen["other walls"]


def test_mixed_walls_still_match_brute_force():
    expected = brute_force(MIXED_WALLS, 1, catalogue())

    solutions = optimise(MIXED_WALLS, 1, TABLES, catalogue(), limit=len(expected))

    assert len(solutions.candidates) == len(expected)
    assert as_set((c.total_cost, names(c)) for c in solutions.candidates) == as_set(expected)


def test_splitting_one_wall_into_two_assemblies_can_only_help():
    """More decisions means a superset of the specifications available as one."""
    together = optimise(
        [a for a in ASSEMBLIES], 1, TABLES, catalogue(), exclude_tags=["brick-veneer"], limit=1
    )
    apart = optimise(
        [
            Assembly("ceiling", "roof", 100.0),
            Assembly("wall A", "wall", 30.0, exclude_tags=("brick-veneer",)),
            Assembly("wall B", "wall", 50.0, exclude_tags=("brick-veneer",)),
            Assembly("joinery", "glazing", 20.0),
            Assembly("entry door", "opaque_door", 4.0),
            Assembly("slab", "slab_on_ground_floor", 100.0),
        ],
        1, TABLES, catalogue(), limit=1,
    )

    assert apart.candidates[0].total_cost <= together.candidates[0].total_cost


def test_the_budget_ignores_how_the_areas_are_grouped():
    """HLreference is a function of geometry, so splitting a wall must not move it."""
    together = optimise(ASSEMBLIES, 1, TABLES, catalogue(), limit=1)
    apart = optimise(MIXED_WALLS, 1, TABLES, catalogue(), limit=1)

    assert together.budget_heat_loss == pytest.approx(apart.budget_heat_loss)


def _tags(candidate, assembly_name):
    return next(s.tags for s in candidate.selections if s.assembly == assembly_name)


# ── constraints ─────────────────────────────────────────────────────────────

def test_excluded_tags_are_never_chosen():
    solutions = optimise(
        ASSEMBLIES, 1, TABLES, catalogue(),
        exclude_tags=["external-insulation", "raft-slab"], limit=25,
    )

    assert solutions.candidates
    for candidate in solutions.candidates:
        for selection in candidate.selections:
            assert "external-insulation" not in selection.tags
            assert "raft-slab" not in selection.tags


def test_excluding_a_tag_can_only_make_the_cheapest_answer_dearer():
    open_search = optimise(ASSEMBLIES, 1, TABLES, catalogue(), limit=1)
    constrained = optimise(
        ASSEMBLIES, 1, TABLES, catalogue(), exclude_tags=["external-insulation"], limit=1
    )

    assert constrained.candidates[0].total_cost >= open_search.candidates[0].total_cost


def test_a_pinned_assembly_is_used_as_given_and_not_searched():
    pinned = [
        a if a.name != "slab" else Assembly("slab", "slab_on_ground_floor", 100.0, fixed_r=1.3)
        for a in ASSEMBLIES
    ]

    solutions = optimise(pinned, 1, TABLES, catalogue(), limit=5)

    assert solutions.candidates
    for candidate in solutions.candidates:
        assert "slab" not in names(candidate)
        slab = [e for e in candidate.result.proposed if e.label == "slab"]
        assert [e.r_value for e in slab] == [1.3]


def test_options_below_the_2_1_2_11_minimum_are_dropped():
    thin_roof = with_options("roof", RAW_CATALOGUE["options"]["roof"] + [
        {"name": "R2.0 ceiling", "r_value": 2.0, "cost_per_m2": 5, "tags": []},
    ])

    solutions = optimise(ASSEMBLIES, 1, TABLES, thin_roof, limit=25)

    assert any("2.1.2.11" in note for note in solutions.notes)
    for candidate in solutions.candidates:
        assert names(candidate)["ceiling"] != "R2.0 ceiling"


def test_every_option_below_the_minimum_is_a_clear_error():
    hopeless = with_options("roof", [
        {"name": "R2.0 ceiling", "r_value": 2.0, "cost_per_m2": 5, "tags": []},
    ])

    with pytest.raises(TableError, match="below the R2.6 minimum"):
        optimise(ASSEMBLIES, 1, TABLES, hopeless)


def test_unpriced_options_are_ignored_but_priced_ones_still_work():
    mixed = with_options("roof", RAW_CATALOGUE["options"]["roof"] + [
        {"name": "unpriced ceiling", "r_value": 9.0, "cost_per_m2": None, "tags": []},
    ])

    solutions = optimise(ASSEMBLIES, 1, TABLES, mixed, limit=25)

    assert any("no cost_per_m2" in note for note in solutions.notes)
    for candidate in solutions.candidates:
        assert names(candidate)["ceiling"] != "unpriced ceiling"


def test_an_entirely_unpriced_element_says_what_to_do():
    unpriced = with_options("glazing", [
        {"name": "double glazing", "r_value": 0.37, "cost_per_m2": None, "tags": []},
    ])

    with pytest.raises(TableError, match="Price the catalogue"):
        optimise(ASSEMBLIES, 1, TABLES, unpriced)


def test_require_tags_that_match_nothing_is_a_clear_error():
    impossible = [Assembly("wall", "wall", 80.0, require_tags=("rammed-earth",))] + [
        a for a in ASSEMBLIES if a.element_type != "wall"
    ]

    with pytest.raises(TableError, match="no catalogue options left"):
        optimise(impossible, 1, TABLES, catalogue())


def test_a_geometry_nothing_can_satisfy_reports_that_rather_than_failing():
    """Zone 6 with a wall of glass: the 40% gate cannot be bought past."""
    glassy = [
        Assembly("ceiling", "roof", 100.0),
        Assembly("wall", "wall", 40.0),
        Assembly("glazing", "glazing", 60.0),
        Assembly("slab", "slab_on_ground_floor", 100.0),
    ]

    solutions = optimise(glassy, 6, TABLES, catalogue(), limit=5)

    assert solutions.candidates == []
    assert any("No combination" in note for note in solutions.notes)


def test_a_heated_slab_is_held_to_table_2_1_2_12():
    heated = [
        a if a.name != "slab"
        else Assembly("slab", "slab_on_ground_floor", 100.0, heated=True)
        for a in ASSEMBLIES
    ]

    solutions = optimise(heated, 5, TABLES, catalogue(), limit=5)

    for candidate in solutions.candidates:
        slab = next(s for s in candidate.selections if s.assembly == "slab")
        assert slab.r_value >= 3.0  # Table 2.1.2.12, zone 5


def test_results_are_provisional_while_either_dataset_is_unverified():
    assert catalogue().verified is True

    solutions = optimise(ASSEMBLIES, 1, TABLES, catalogue(), limit=1)

    # TABLES ships unverified, so the run is still provisional and says why.
    assert solutions.provisional is True
    assert any("checked by a person" in note for note in solutions.notes)


def test_an_unpriced_catalogue_on_disk_still_loads_and_describes_itself():
    """The shipped catalogue is a template — it must parse, and must not pretend to be real."""
    shipped = catalogue_module.load()

    assert shipped.verified is False
    assert set(shipped.options).issubset(set(tables_module.ELEMENT_TYPES))
    assert all(
        option.cost_per_m2 is None
        for options in shipped.options.values()
        for option in options
    ), "The shipped catalogue now has prices — replace this test with one covering the real data."


# ── input validation ────────────────────────────────────────────────────────

@pytest.mark.parametrize(
    "assemblies, climate_zone, limit, message",
    [
        ([], 1, 5, "No assemblies supplied"),
        ([Assembly("x", "chimney", 10.0)], 1, 5, "unknown element type"),
        ([Assembly("x", "wall", 0.0)], 1, 5, "area must be positive"),
        ([Assembly("", "wall", 10.0)], 1, 5, "needs a name"),
        (ASSEMBLIES, 9, 5, "Climate zone 9"),
        (ASSEMBLIES, 1, 0, "limit must be at least 1"),
    ],
)
def test_bad_input_is_rejected(assemblies, climate_zone, limit, message):
    with pytest.raises(TableError, match=message):
        optimise(assemblies, climate_zone, TABLES, catalogue(), limit=limit)


def test_duplicate_assembly_names_are_rejected():
    with pytest.raises(TableError, match="Duplicate assembly name"):
        optimise(
            [Assembly("wall", "wall", 40.0), Assembly("wall", "wall", 40.0)],
            1, TABLES, catalogue(),
        )


def test_pinning_and_filtering_the_same_assembly_is_rejected():
    with pytest.raises(TableError, match="drop one or the other"):
        optimise(
            [Assembly("wall", "wall", 40.0, fixed_r=2.0, require_tags=("deep-stud",))],
            1, TABLES, catalogue(),
        )


def test_pinning_everything_is_rejected():
    with pytest.raises(TableError, match="nothing to search"):
        optimise([Assembly("wall", "wall", 80.0, fixed_r=2.0)], 1, TABLES, catalogue())


def test_a_foil_build_up_is_flagged_as_ending_the_pathway_not_ranked_silently():
    """1.1.2.1: foil anywhere in the building takes it out of H1/AS1 entirely."""
    from h1.scope import FOIL_INSULATION_TAG

    foiled = with_options("wall", RAW_CATALOGUE["options"]["wall"] + [
        {"name": "foil-faced wall", "r_value": 3.0, "cost_per_m2": 60,
         "tags": ["weatherboard", FOIL_INSULATION_TAG]},
    ])

    solutions = optimise(ASSEMBLIES, 1, TABLES, foiled, limit=20)

    note = next(n for n in solutions.notes if "1.1.2.1" in n)
    assert "foil-faced wall" in note
    assert FOIL_INSULATION_TAG in note
    # It is cheap, so it is chosen — the caller is warned, not overruled, and
    # each selection carries its tags so the affected candidates are visible.
    chosen = [c for c in solutions.candidates if "foil-faced wall" in names(c).values()]
    assert chosen
    assert FOIL_INSULATION_TAG in _tags(chosen[0], "external wall")


def test_excluding_the_foil_tag_removes_both_the_option_and_the_warning():
    from h1.scope import FOIL_INSULATION_TAG

    foiled = with_options("wall", RAW_CATALOGUE["options"]["wall"] + [
        {"name": "foil-faced wall", "r_value": 3.0, "cost_per_m2": 60,
         "tags": ["weatherboard", FOIL_INSULATION_TAG]},
    ])

    solutions = optimise(ASSEMBLIES, 1, TABLES, foiled,
                         exclude_tags=[FOIL_INSULATION_TAG], limit=20)

    assert not any("1.1.2.1" in n for n in solutions.notes)
    for candidate in solutions.candidates:
        assert "foil-faced wall" not in names(candidate).values()


def test_a_catalogue_without_foil_says_nothing_about_it():
    solutions = optimise(ASSEMBLIES, 1, TABLES, catalogue(), limit=5)

    assert not any("1.1.2.1" in n for n in solutions.notes)


def _uses_last_resort(candidate):
    from h1.optimise import LAST_RESORT_TAG
    return any(LAST_RESORT_TAG in s.tags for s in candidate.selections)


def _slab_as_last_resort(cost_of_insulated=260):
    """Insulating the slab is offered, but only once nothing else will do."""
    from h1.optimise import LAST_RESORT_TAG
    return with_options("slab_on_ground_floor", [
        {"name": "uninsulated slab", "r_value": 1.3, "cost_per_m2": 150,
         "tags": ["conventional-slab"]},
        {"name": "underslab insulation", "r_value": 2.5, "cost_per_m2": cost_of_insulated,
         "tags": ["conventional-slab", LAST_RESORT_TAG]},
    ])


def test_a_last_resort_option_is_never_the_first_choice_even_when_cheapest():
    """Priced below the uninsulated slab it would win on cost alone — it must not."""
    cat = _slab_as_last_resort(cost_of_insulated=100)
    assert brute_force(ASSEMBLIES, 1, cat)[0][1]["slab"] == "underslab insulation"

    solutions = optimise(ASSEMBLIES, 1, TABLES, cat, limit=40)

    assert not _uses_last_resort(solutions.candidates[0])
    flags = [_uses_last_resort(c) for c in solutions.candidates]
    assert flags == sorted(flags), "a last-resort answer ranked ahead of one without it"


def test_with_enough_alternatives_the_last_resort_does_not_appear():
    solutions = optimise(ASSEMBLIES, 1, TABLES, _slab_as_last_resort(cost_of_insulated=100), limit=5)

    assert len(solutions.candidates) == 5
    assert not any(_uses_last_resort(c) for c in solutions.candidates)


def test_the_last_resort_is_used_when_nothing_complies_without_it():
    W, R, G = (RAW_CATALOGUE["options"][k] for k in ("wall", "roof", "glazing"))
    cat = _slab_as_last_resort()
    cat = catalogue_module.parse({**RAW_CATALOGUE, "options": {
        **RAW_CATALOGUE["options"],
        "wall": [W[0]], "roof": [R[0]], "glazing": [G[1]],
        "slab_on_ground_floor": [
            {"name": o.name, "r_value": o.r_value, "cost_per_m2": o.cost_per_m2, "tags": list(o.tags)}
            for o in cat.options["slab_on_ground_floor"]
        ],
    }})
    assert {s["slab"] for _, s in brute_force(ASSEMBLIES, 1, cat)} == {"underslab insulation"}

    solutions = optimise(ASSEMBLIES, 1, TABLES, cat, limit=5)

    assert solutions.candidates
    assert all(_uses_last_resort(c) for c in solutions.candidates)
    note = next(n for n in solutions.notes if "last resort" in n)
    assert "underslab insulation" in note
