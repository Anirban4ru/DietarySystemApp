/*
# IDS Feature Expansion — Favorites, Meal Plan, Shopping List, Goals, XP

## Purpose
Adds persistence for 5 new feature areas: recipe favorites, weekly meal plan,
shopping list, weekly goals, and XP/level tracking.

## New Tables

1. `recipe_favorites` — bookmarked rescue meals.
   - id, recipe_name, created_at

2. `meal_plan` — weekly meal planner entries.
   - id, day_of_week (0-6), meal_type (breakfast/lunch/dinner/snack), recipe_name, planned_date, created_at

3. `shopping_list` — auto-generated shopping items from missing ingredients.
   - id, item_name, category, quantity, checked, created_at

4. `weekly_goals` — user's weekly waste reduction targets.
   - id, target_meals, target_co2e, updated_at

5. `xp_state` — single row tracking total XP and level.
   - id, total_xp, updated_at

## Security
- RLS enabled on all tables. Single-tenant no-auth: anon + authenticated CRUD.
*/

CREATE TABLE IF NOT EXISTS recipe_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE recipe_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_fav" ON recipe_favorites;
CREATE POLICY "anon_select_fav" ON recipe_favorites FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_fav" ON recipe_favorites;
CREATE POLICY "anon_insert_fav" ON recipe_favorites FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_fav" ON recipe_favorites;
CREATE POLICY "anon_delete_fav" ON recipe_favorites FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS meal_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week int NOT NULL,
  meal_type text NOT NULL,
  recipe_name text NOT NULL,
  planned_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE meal_plan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_mealplan" ON meal_plan;
CREATE POLICY "anon_select_mealplan" ON meal_plan FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_mealplan" ON meal_plan;
CREATE POLICY "anon_insert_mealplan" ON meal_plan FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_mealplan" ON meal_plan;
CREATE POLICY "anon_delete_mealplan" ON meal_plan FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS shopping_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  quantity numeric NOT NULL DEFAULT 1,
  checked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_shopping" ON shopping_list;
CREATE POLICY "anon_select_shopping" ON shopping_list FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_shopping" ON shopping_list;
CREATE POLICY "anon_insert_shopping" ON shopping_list FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_shopping" ON shopping_list;
CREATE POLICY "anon_update_shopping" ON shopping_list FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_shopping" ON shopping_list;
CREATE POLICY "anon_delete_shopping" ON shopping_list FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS weekly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_meals int NOT NULL DEFAULT 5,
  target_co2e real NOT NULL DEFAULT 10,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_goals" ON weekly_goals;
CREATE POLICY "anon_select_goals" ON weekly_goals FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_goals" ON weekly_goals;
CREATE POLICY "anon_insert_goals" ON weekly_goals FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_goals" ON weekly_goals;
CREATE POLICY "anon_update_goals" ON weekly_goals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS xp_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_xp int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE xp_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_xp" ON xp_state;
CREATE POLICY "anon_select_xp" ON xp_state FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_xp" ON xp_state;
CREATE POLICY "anon_insert_xp" ON xp_state FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_xp" ON xp_state;
CREATE POLICY "anon_update_xp" ON xp_state FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
