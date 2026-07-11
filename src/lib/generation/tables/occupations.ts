/*
  GM-authored occupation table. fantasy-content-generator (MIT) has no
  occupation data anywhere in its package (verified against its full
  source tree); mjmcphee/dnd-npc-generator has no license file at all,
  so its tables aren't portable. This list was drafted for this app and
  approved by the GM (2026-07-10) before being wired in, per the "no
  fabricated value sets, ask rather than invent" rule: it counts as
  GM-authored source data, not an invented placeholder.
*/
export const OCCUPATIONS = [
  "Farmer",
  "Blacksmith",
  "Innkeeper",
  "Merchant",
  "Guard",
  "Soldier",
  "Mercenary",
  "Smuggler",
  "Thief",
  "Fence",
  "Sailor",
  "Fisherman",
  "Hunter",
  "Trapper",
  "Herbalist",
  "Healer",
  "Priest",
  "Acolyte",
  "Scholar",
  "Scribe",
  "Alchemist",
  "Wizard's Apprentice",
  "Bard",
  "Actor",
  "Gambler",
  "Gravedigger",
  "Undertaker",
  "Beggar",
  "Noble",
  "Steward",
  "Tax Collector",
  "Bounty Hunter",
  "Stablehand",
  "Cartographer",
  "Miner",
] as const;

export type Occupation = (typeof OCCUPATIONS)[number];
