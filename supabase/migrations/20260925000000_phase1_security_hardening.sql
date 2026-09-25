-- Phase 1: Secure the Backend
-- New migration: fix security warnings + add push_tokens table + add subscription_tier to user_profile
-- Runs safely even if columns already exist.

-- ============================================================
-- 1. Fix SECURITY DEFINER warnings from Supabase advisor
-- ============================================================

-- delete_user: keep SECURITY DEFINER but revoke public EXECUTE,
-- then grant only to authenticated so only logged-in users can call it,
-- AND add a guard so a user can only delete their own account.
DROP FUNCTION IF EXISTS public.delete_user();
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow a user to delete their own auth account
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_user() FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_user() TO authenticated;

-- get_global_leaderboard: switch to SECURITY INVOKER so it runs as the calling user's role.
-- Leaderboard only shows aggregated public data so INVOKER is safe.
DROP FUNCTION IF EXISTS public.get_global_leaderboard();
CREATE OR REPLACE FUNCTION public.get_global_leaderboard()
RETURNS TABLE(user_id uuid, total_xp bigint, rank bigint)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    user_id,
    total_xp,
    RANK() OVER (ORDER BY total_xp DESC) AS rank
  FROM public.xp_state
  ORDER BY total_xp DESC
  LIMIT 50;
$$;

REVOKE EXECUTE ON FUNCTION public.get_global_leaderboard() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_global_leaderboard() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_global_leaderboard() TO authenticated;

-- ============================================================
-- 2. Atomic XP increment — replaces read-then-write from client
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_xp(delta integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_xp integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.xp_state (user_id, total_xp, updated_at)
  VALUES (auth.uid(), delta, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_xp = xp_state.total_xp + delta,
    updated_at = now()
  RETURNING total_xp INTO new_xp;

  RETURN new_xp;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_xp(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_xp(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_xp(integer) TO authenticated;

-- ============================================================
-- 3. subscription_tier on user_profile (Phase 6)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profile' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE public.user_profile
      ADD COLUMN subscription_tier text NOT NULL DEFAULT 'free'
      CHECK (subscription_tier IN ('free', 'pro'));
  END IF;
END $$;

-- ============================================================
-- 4. push_tokens table (Phase 5)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_tokens_owner_all" ON public.push_tokens;
CREATE POLICY "push_tokens_owner_all" ON public.push_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 5. xp_state unique constraint on user_id (needed for ON CONFLICT above)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'xp_state_user_id_key' AND conrelid = 'public.xp_state'::regclass
  ) THEN
    ALTER TABLE public.xp_state ADD CONSTRAINT xp_state_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- ============================================================
-- 6. Ensure all tables still have strict per-user RLS
--    (idempotent — won't fail if policies already exist)
-- ============================================================

-- inventory_items
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_owner_all" ON public.inventory_items;
CREATE POLICY "inventory_owner_all" ON public.inventory_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_profile
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_owner_all" ON public.user_profile;
CREATE POLICY "profile_owner_all" ON public.user_profile
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- impact_log
ALTER TABLE public.impact_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "impact_owner_all" ON public.impact_log;
CREATE POLICY "impact_owner_all" ON public.impact_log
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- disposal_events
ALTER TABLE public.disposal_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "disposal_owner_all" ON public.disposal_events;
CREATE POLICY "disposal_owner_all" ON public.disposal_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- recipe_favorites
ALTER TABLE public.recipe_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "favorites_owner_all" ON public.recipe_favorites;
CREATE POLICY "favorites_owner_all" ON public.recipe_favorites
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- shopping_list
ALTER TABLE public.shopping_list ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shopping_owner_all" ON public.shopping_list;
CREATE POLICY "shopping_owner_all" ON public.shopping_list
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- meal_plan
ALTER TABLE public.meal_plan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "meal_plan_owner_all" ON public.meal_plan;
CREATE POLICY "meal_plan_owner_all" ON public.meal_plan
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- weekly_goals
ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "goals_owner_all" ON public.weekly_goals;
CREATE POLICY "goals_owner_all" ON public.weekly_goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- xp_state
ALTER TABLE public.xp_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "xp_owner_all" ON public.xp_state;
CREATE POLICY "xp_owner_all" ON public.xp_state
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
