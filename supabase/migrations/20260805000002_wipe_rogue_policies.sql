DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END
$$;

-- 1. inventory_items
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_select_inventory" ON inventory_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_insert_inventory" ON inventory_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_update_inventory" ON inventory_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_delete_inventory" ON inventory_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. user_profile
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_select_profile" ON user_profile FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_insert_profile" ON user_profile FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_update_profile" ON user_profile FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_delete_profile" ON user_profile FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. impact_log
ALTER TABLE impact_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_select_impact" ON impact_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_insert_impact" ON impact_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_update_impact" ON impact_log FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_delete_impact" ON impact_log FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. disposal_events
ALTER TABLE disposal_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_select_disposal" ON disposal_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_insert_disposal" ON disposal_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_update_disposal" ON disposal_events FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_delete_disposal" ON disposal_events FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. recipe_favorites
ALTER TABLE recipe_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_select_recipe_favorites" ON recipe_favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_insert_recipe_favorites" ON recipe_favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_update_recipe_favorites" ON recipe_favorites FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_delete_recipe_favorites" ON recipe_favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 6. shopping_list
ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_select_shopping_list" ON shopping_list FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_insert_shopping_list" ON shopping_list FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_update_shopping_list" ON shopping_list FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_delete_shopping_list" ON shopping_list FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 7. meal_plan
ALTER TABLE meal_plan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_select_meal_plan" ON meal_plan FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_insert_meal_plan" ON meal_plan FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_update_meal_plan" ON meal_plan FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_delete_meal_plan" ON meal_plan FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 8. weekly_goals
ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_select_weekly_goals" ON weekly_goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_insert_weekly_goals" ON weekly_goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_update_weekly_goals" ON weekly_goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_delete_weekly_goals" ON weekly_goals FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 9. xp_state
ALTER TABLE xp_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_select_xp_state" ON xp_state FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_insert_xp_state" ON xp_state FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_update_xp_state" ON xp_state FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_delete_xp_state" ON xp_state FOR DELETE TO authenticated USING (auth.uid() = user_id);
