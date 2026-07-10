# SRD data provenance

## Source

Repository: https://github.com/5e-bits/5e-database
Release tag: v5.10.0
Commit: 3f5593ea004c4f5a2af95603087ce4de72689d9f
Retrieved: 2026-07-09
Files vendored unmodified from `src/2014/en/` at that tag:

- `5e-SRD-Monsters.json` (334 records)
- `5e-SRD-Equipment.json` (237 records)
- `5e-SRD-Magic-Items.json` (362 records)

SHA-256 checksums at retrieval time matched the tagged files exactly (verified against raw.githubusercontent.com at the same tag).

## License

Repository code: MIT (`LICENSE.md`).

Data: the repository's own README states "The underlying material is released using the Open Gaming License Version 1.0a," not CC-BY. This differs from what this project assumed going in.

Proceeding on a CC-BY basis regardless, because Wizards of the Coast made SRD 5.1 content available under CC-BY 4.0 as a second, irrevocable license starting January 2023, in parallel with the original OGL 1.0a. That grant applies to the SRD 5.1 content itself and does not depend on how this particular repository documents its own license. This project's CC-BY attribution requirement (see docs/features-and-decisions.md) is based on that direct Wizards of the Coast grant, not on this repository's stated license.

This determination was confirmed with the project owner before vendoring the data (2026-07-09).

## Known data quirk

`5e-SRD-Magic-Items.json` contains one name collision: a variant-group record named "Potion of Healing" (`variant: false`, listing four tiers) and its common-tier child record (`index: potion-of-healing-common`, `variant: true`) both carry the exact name "Potion of Healing." The import script keeps the group record and skips the colliding child; see the import run summary for the exact log line. No other name collisions exist across the three files.

## Attunement derivation

`srd_entries.attunement` is not a structured field in the source. Magic items in `5e-SRD-Magic-Items.json` carry no `attunement` or `requires_attunement` key anywhere; equipment in `5e-SRD-Equipment.json` carries no such field either, since the concept does not apply to mundane gear.

For magic items, attunement is parsed from a literal text marker in the `desc` field (an array of strings). Every one of the 362 magic items opens with a structured header line at `desc[0]`, in the form "Type (subtype), rarity" or "Type (subtype), rarity (requires attunement...)". The import script checks that header line, case insensitively, for the phrase "requires attunement". 175 of 362 records carry the marker in that header line; the other 187 do not. The phrase occurs with 14 distinct trailing variants depending on who or what can attune, for example:

- "requires attunement" (bare, the most common form, 146 of the 175)
- "requires attunement by a spellcaster"
- "requires attunement by a sorcerer, warlock, or wizard"
- "requires attunement by a creature of good alignment"
- "requires attunement outdoors at night"

and 9 further "by a `<class or creature>`" variants, each matched by the same case insensitive "requires attunement" check rather than an exhaustive list of trailing conditions.

Extraction is scoped to the header line only, not the full `desc` array. One item, Hammer of Thunderbolts, mentions "(Requires Attunement)" outside the header, in body text describing a conditional bonus effect that also requires two other specific items to be worn. Its header line ("Weapon (maul), legendary") carries no attunement marker, so it is recorded as `attunement: false`. This scoping was a deliberate decision, confirmed with the project owner, to avoid conflating an item's own attunement requirement with unrelated attunement mentions elsewhere in its description.

Every magic item therefore gets `attunement: true` or `attunement: false`, never null. Equipment always gets `attunement: null`, since the source carries no such field and the concept does not apply.

On re-import, attunement is recomputed from the vendored source and overwritten, since it is a derived value, not a hand-edited one (unlike environment).
