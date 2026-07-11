/*
  4d6-drop-lowest per stat: the one generation rule in this service not
  sourced from a table library (fantasy-content-generator has no ability
  score generation anywhere in its package). It's the standard tabletop
  method, not an invented one, but flagged here since it's the single
  exception to "everything comes from a library or the SRD."
*/

function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function roll4d6DropLowest(): number {
  const rolls = [rollD6(), rollD6(), rollD6(), rollD6()];
  rolls.sort((a, b) => a - b);
  return rolls[1] + rolls[2] + rolls[3];
}

export interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export function rollAbilityScores(): AbilityScores {
  return {
    str: roll4d6DropLowest(),
    dex: roll4d6DropLowest(),
    con: roll4d6DropLowest(),
    int: roll4d6DropLowest(),
    wis: roll4d6DropLowest(),
    cha: roll4d6DropLowest(),
  };
}
