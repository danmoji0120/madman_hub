# Mercenary Combat Stages

## Runtime Source

Combat runtime keeps the six base sheet combat missions as theme groups and uses generated stage missions for actual battle execution.

- Base mission rows remain in `mercenary.combat-missions.master.json`.
- Generated stage rows are marked with `isStageMission: true`.
- The battle board groups stage missions by `baseMissionId`.
- Stage 1 is also executed through its generated mission id.

## Stage Metadata

Generated stage missions include these fields:

- `stageId`
- `baseMissionId`
- `stageNumber`
- `stageTier`
- `generatedMissionId`
- `generatedEncounterId`
- `generatedRewardGroupId`
- `unlockCondition`

Encounter enemy rows can include `stageModifiers`. The client battle builder applies those multipliers to enemy stats after resolving the enemy template.

## Unlock Rules

The client displays locked stages and disables locked stage buttons. The server also validates stage unlocks during battle claim.

Supported unlock conditions:

- `default`
- `clear:<mission_id>`
- `office_level>=N`
- `rumor_seed:<key>`
- `case_or_rumor:<key>`

Multiple conditions separated by semicolons are treated as AND conditions.

Rumor and case conditions are currently locked until their source systems expose clear verification data.

## Clear Records

Victory claims for generated stage missions upsert `user_mercenary_combat_stage_clears`.

Tracked fields include:

- `mission_id`
- `stage_id`
- `base_mission_id`
- `clear_count`
- `best_result`
- `best_rounds`
- `first_cleared_at`
- `last_cleared_at`

Duplicate battle claim protection remains the first guard against repeated reward or clear-count increments.

## API

`GET /api/mercenary/combat-stage-clears` returns the user's stage clear records.

Locked stage claim attempts return:

- HTTP `403`
- `code: "STAGE_LOCKED"`
- `reasons: [...]`

## Next Steps

- Add authenticated browser QA for generated stage victory claims.
- Connect rumor and case unlock verification.
- Convert the grouped stage UI into a richer stage selector if the list grows beyond 31 stages.


## Stage clear refresh

After a victory claim succeeds, the client force-refreshes `/api/mercenary/combat-stage-clears`, recomputes stage unlock state, and rerenders the open battle board. Stage 1 clear can therefore unlock Stage 2 without a manual page refresh.

## Enemy preview layout

The battle board uses a horizontal enemy preview strip for selected stages. Enemy cards keep a minimum width and scroll horizontally when Stage 5/EX has many enemies or boss rows, so reward and detail sections remain inside the scrollable center panel.
