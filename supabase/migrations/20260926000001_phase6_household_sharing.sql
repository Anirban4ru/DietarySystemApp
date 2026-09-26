-- ====================================================================
-- NOURISH — Phase 6: Household Pantry Sharing Schema & RLS
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(household_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

-- Revoke anon access
REVOKE ALL ON public.households FROM anon;
REVOKE ALL ON public.household_members FROM anon;

-- Grant authenticated access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.households TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_members TO authenticated;

-- Policies for households
DROP POLICY IF EXISTS "Users can read households they belong to" ON public.households;
CREATE POLICY "Users can read households they belong to"
  ON public.households
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_members.household_id = households.id
      AND household_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create households" ON public.households;
CREATE POLICY "Users can create households"
  ON public.households
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Owners can update their households" ON public.households;
CREATE POLICY "Owners can update their households"
  ON public.households
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Policies for household_members
DROP POLICY IF EXISTS "Members can view other members in same household" ON public.household_members;
CREATE POLICY "Members can view other members in same household"
  ON public.household_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can join households" ON public.household_members;
CREATE POLICY "Users can join households"
  ON public.household_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can leave households" ON public.household_members;
CREATE POLICY "Users can leave households"
  ON public.household_members
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
