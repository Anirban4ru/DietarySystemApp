-- ==============================================================================
-- Intelligent Dietary System (IDS) — Comprehensive Security & Multi-User Isolation
-- ==============================================================================

-- 1. Ensure user_id column exists with foreign key and default auth.uid() on all user tables
DO $$
BEGIN
  -- inventory_items
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'user_id') THEN
    ALTER TABLE public.inventory_items ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
  ELSE
    ALTER TABLE public.inventory_items ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;

  -- user_profile
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profile' AND column_name = 'user_id') THEN
    ALTER TABLE public.user_profile ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
  ELSE
    ALTER TABLE public.user_profile ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;

  -- impact_log
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'impact_log' AND column_name = 'user_id') THEN
    ALTER TABLE public.impact_log ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
  ELSE
    ALTER TABLE public.impact_log ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;

  -- disposal_events
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'disposal_events' AND column_name = 'user_id') THEN
    ALTER TABLE public.disposal_events ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
  ELSE
    ALTER TABLE public.disposal_events ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;

  -- recipe_favorites
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'recipe_favorites' AND column_name = 'user_id') THEN
    ALTER TABLE public.recipe_favorites ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
  ELSE
    ALTER TABLE public.recipe_favorites ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;

  -- shopping_list
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shopping_list' AND column_name = 'user_id') THEN
    ALTER TABLE public.shopping_list ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
  ELSE
    ALTER TABLE public.shopping_list ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;

  -- meal_plan
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meal_plan' AND column_name = 'user_id') THEN
    ALTER TABLE public.meal_plan ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
  ELSE
    ALTER TABLE public.meal_plan ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;

  -- weekly_goals
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'weekly_goals' AND column_name = 'user_id') THEN
    ALTER TABLE public.weekly_goals ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
  ELSE
    ALTER TABLE public.weekly_goals ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;

  -- xp_state
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'xp_state' AND column_name = 'user_id') THEN
    ALTER TABLE public.xp_state ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
  ELSE
    ALTER TABLE public.xp_state ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;

  -- saved_recipes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'saved_recipes') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'saved_recipes' AND column_name = 'user_id') THEN
      ALTER TABLE public.saved_recipes ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
    ELSE
      ALTER TABLE public.saved_recipes ALTER COLUMN user_id SET DEFAULT auth.uid();
    END IF;
  END IF;
END $$;

-- 2. Enable Row Level Security (RLS) on all 10 tables
ALTER TABLE IF EXISTS public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.impact_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.disposal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.recipe_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shopping_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.meal_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.weekly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.xp_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.saved_recipes ENABLE ROW LEVEL SECURITY;

-- 3. Drop all existing legacy / permissive policies on public tables
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN (
            'inventory_items', 'user_profile', 'impact_log', 'disposal_events',
            'recipe_favorites', 'shopping_list', 'meal_plan', 'weekly_goals',
            'xp_state', 'saved_recipes'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END
$$;

-- 4. Create strict, isolated policies: auth.uid() = user_id

-- (1) inventory_items
CREATE POLICY "user_isolation_select_inventory" ON public.inventory_items
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_isolation_insert_inventory" ON public.inventory_items
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_update_inventory" ON public.inventory_items
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_delete_inventory" ON public.inventory_items
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- (2) user_profile
CREATE POLICY "user_isolation_select_profile" ON public.user_profile
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_isolation_insert_profile" ON public.user_profile
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_update_profile" ON public.user_profile
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_delete_profile" ON public.user_profile
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- (3) impact_log
CREATE POLICY "user_isolation_select_impact" ON public.impact_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_isolation_insert_impact" ON public.impact_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_update_impact" ON public.impact_log
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_delete_impact" ON public.impact_log
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- (4) disposal_events
CREATE POLICY "user_isolation_select_disposal" ON public.disposal_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_isolation_insert_disposal" ON public.disposal_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_update_disposal" ON public.disposal_events
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_delete_disposal" ON public.disposal_events
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- (5) recipe_favorites
CREATE POLICY "user_isolation_select_favorites" ON public.recipe_favorites
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_isolation_insert_favorites" ON public.recipe_favorites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_update_favorites" ON public.recipe_favorites
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_delete_favorites" ON public.recipe_favorites
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- (6) shopping_list
CREATE POLICY "user_isolation_select_shopping" ON public.shopping_list
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_isolation_insert_shopping" ON public.shopping_list
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_update_shopping" ON public.shopping_list
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_delete_shopping" ON public.shopping_list
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- (7) meal_plan
CREATE POLICY "user_isolation_select_meal_plan" ON public.meal_plan
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_isolation_insert_meal_plan" ON public.meal_plan
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_update_meal_plan" ON public.meal_plan
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_delete_meal_plan" ON public.meal_plan
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- (8) weekly_goals
CREATE POLICY "user_isolation_select_goals" ON public.weekly_goals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_isolation_insert_goals" ON public.weekly_goals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_update_goals" ON public.weekly_goals
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_delete_goals" ON public.weekly_goals
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- (9) xp_state
CREATE POLICY "user_isolation_select_xp" ON public.xp_state
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_isolation_insert_xp" ON public.xp_state
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_update_xp" ON public.xp_state
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_delete_xp" ON public.xp_state
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- (10) saved_recipes
CREATE POLICY "user_isolation_select_saved_recipes" ON public.saved_recipes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_isolation_insert_saved_recipes" ON public.saved_recipes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_update_saved_recipes" ON public.saved_recipes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_isolation_delete_saved_recipes" ON public.saved_recipes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. Revoke ALL table permissions from anon role to guarantee no unauthenticated leak
REVOKE ALL ON public.inventory_items FROM anon;
REVOKE ALL ON public.user_profile FROM anon;
REVOKE ALL ON public.impact_log FROM anon;
REVOKE ALL ON public.disposal_events FROM anon;
REVOKE ALL ON public.recipe_favorites FROM anon;
REVOKE ALL ON public.shopping_list FROM anon;
REVOKE ALL ON public.meal_plan FROM anon;
REVOKE ALL ON public.weekly_goals FROM anon;
REVOKE ALL ON public.xp_state FROM anon;
REVOKE ALL ON public.saved_recipes FROM anon;

-- 6. Grant authenticated role full access subject to RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profile TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.impact_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.disposal_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_list TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plan TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.xp_state TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_recipes TO authenticated;
