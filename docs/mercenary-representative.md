# Mercenary Representative 0.1

## Purpose

Each office can select one owned mercenary as its representative. The representative is a user-owned instance, not a character master record, so its level, equipped items, and enhancement state remain specific to that office.

The representative is the lobby hero today. It is also the planned default face for future support-mercenary registration, rescue-request profile cards, and other asynchronous multiplayer surfaces. Those multiplayer features are not implemented in 0.1.

## Storage and API

- Storage: `user_mercenary_profiles.representative_user_mercenary_id`
- Read: `GET /api/mercenary/representative`
- Set: `PATCH /api/mercenary/representative` with `{ "userMercenaryId": "..." }`

The server verifies that the chosen `userMercenaryId` belongs to the logged-in user and is not dismissed. Locked, injured, and busy mercenaries can still represent the office; their current status remains visible.

## Supabase Deployment

Supabase uses `UUID` for `user_mercenaries.id`, so `representative_user_mercenary_id` is also a `UUID` in Postgres. Run [supabase.representative-migration.sql](../database/supabase.representative-migration.sql) in the project's Supabase SQL Editor, then restart the application server. The migration includes `NOTIFY pgrst, 'reload schema'` to refresh PostgREST's schema cache and prevent `PGRST204` for the new column.

## Lifecycle

- Equipment, enhancement, and lock refreshes reload the roster and refresh the lobby hero.
- Dismissing the representative clears the profile reference after the soft-dismiss succeeds.
- If a stale reference is found during `GET`, it is cleared and the client receives an empty representative response.

## UI

The lobby dashboard contains office status, the representative hero, and primary office entry points. The roster detail action area provides the `Representative` action. The hero exposes detail and equipment-management entry points while preserving existing roster, inventory, blacksmith, battle, recruit, and claim flows.
