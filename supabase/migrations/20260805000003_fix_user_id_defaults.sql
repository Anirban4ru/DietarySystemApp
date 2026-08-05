-- Fix user_id columns to default to auth.uid() so frontend inserts work seamlessly
ALTER TABLE inventory_items ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE user_profile ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE impact_log ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE disposal_events ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE recipe_favorites ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE shopping_list ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE meal_plan ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE weekly_goals ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE xp_state ALTER COLUMN user_id SET DEFAULT auth.uid();
