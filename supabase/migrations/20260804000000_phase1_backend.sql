CREATE TABLE IF NOT EXISTS public.saved_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  recipe_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own saved recipes."
  ON public.saved_recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own saved recipes."
  ON public.saved_recipes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved recipes."
  ON public.saved_recipes FOR DELETE
  USING (auth.uid() = user_id);


-- Global Leaderboard RPC
CREATE OR REPLACE FUNCTION public.get_global_leaderboard()
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  total_xp INT,
  rank BIGINT
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT 
    x.id as user_id,
    COALESCE(p.name, 'Anonymous Chef') as display_name,
    x.total_xp,
    RANK() OVER (ORDER BY x.total_xp DESC) as rank
  FROM public.xp_state x
  LEFT JOIN public.user_profile p ON x.id = p.id
  ORDER BY x.total_xp DESC
  LIMIT 100;
$$;
