# Mercenary Drop Guide 0.1

## Scope

- Battle board reward previews are resolved from `mercenary.combat-rewards.master.json`.
- Item and equipment names are resolved through the item/equipment master bundle.
- Inventory detail panels show combat drop sources for the selected `itemId`.
- Blacksmith material costs expose a source guide for missing materials.
- The guide is informational only. It does not change claim, reward, stage unlock, combat, or blacksmith formulas.

## Reward Source Rules

- Stage missions use their generated reward group first.
- If a stage reward group is unavailable, UI helpers can fall back to the base mission reward group.
- `dropRate` is displayed as a readable label:
  - `70%+`: high chance
  - `30-69%`: normal chance
  - `5-29%`: low chance
  - `1-4.9%`: rare
  - `<1%`: very rare

## Equipment Policy

- Normal combat primarily drops N/R equipment.
- SR equipment is shown as rare or very rare depending on the exported reward row.
- SSR/EX equipment is not presented as a normal combat drop.

## Future Work

- Add richer item encyclopedia pages.
- Add server-provided compact reward preview endpoints if public JSON scanning becomes too heavy.
- Add source filters for blacksmith-only and special-content-only materials.
