-- Run this in the Supabase SQL Editor for an existing project.
-- The representative is a user_mercenaries instance id, whose Supabase type is UUID.

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('user_mercenary_profiles', 'user_mercenaries')
  AND column_name IN ('id', 'representative_user_mercenary_id');

ALTER TABLE public.user_mercenary_profiles
  ADD COLUMN IF NOT EXISTS representative_user_mercenary_id UUID;

-- A short-lived earlier local schema used TEXT. Preserve valid UUID values if that
-- column was already created in a deployed database before this migration.
DO $$
DECLARE
  representative_type TEXT;
BEGIN
  SELECT data_type
    INTO representative_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'user_mercenary_profiles'
    AND column_name = 'representative_user_mercenary_id';

  IF representative_type = 'text' THEN
    ALTER TABLE public.user_mercenary_profiles
      ALTER COLUMN representative_user_mercenary_id TYPE UUID
      USING NULLIF(representative_user_mercenary_id, '')::UUID;
  END IF;
END $$;

-- Reload PostgREST's schema cache so the new column is available immediately.
NOTIFY pgrst, 'reload schema';

-- Optional verification after the reload.
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_mercenary_profiles'
  AND column_name = 'representative_user_mercenary_id';
