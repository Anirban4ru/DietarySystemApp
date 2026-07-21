/*
# Update schema for authenticated multi-tenancy

Adds user_id to all tables and locks down RLS so users only see their own data.
*/

-- Add user_id to inventory_items
ALTER TABLE inventory_items ADD COLUMN user_id uuid DEFAULT auth.uid();
UPDATE inventory_items SET user_id = auth.uid() WHERE user_id IS NULL;
ALTER TABLE inventory_items ALTER COLUMN user_id SET NOT NULL;

DROP POLICY IF EXISTS "anon_select_inventory" ON inventory_items;
DROP POLICY IF EXISTS "anon_insert_inventory" ON inventory_items;
DROP POLICY IF EXISTS "anon_update_inventory" ON inventory_items;
DROP POLICY IF EXISTS "anon_delete_inventory" ON inventory_items;

CREATE POLICY "user_select_inventory" ON inventory_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_insert_inventory" ON inventory_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_update_inventory" ON inventory_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_delete_inventory" ON inventory_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add user_id to user_profile
ALTER TABLE user_profile ADD COLUMN user_id uuid DEFAULT auth.uid();
UPDATE user_profile SET user_id = auth.uid() WHERE user_id IS NULL;
ALTER TABLE user_profile ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE user_profile ADD CONSTRAINT unique_user_profile UNIQUE (user_id);

DROP POLICY IF EXISTS "anon_select_profile" ON user_profile;
DROP POLICY IF EXISTS "anon_insert_profile" ON user_profile;
DROP POLICY IF EXISTS "anon_update_profile" ON user_profile;
DROP POLICY IF EXISTS "anon_delete_profile" ON user_profile;

CREATE POLICY "user_select_profile" ON user_profile FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_insert_profile" ON user_profile FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_update_profile" ON user_profile FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_delete_profile" ON user_profile FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add user_id to impact_log
ALTER TABLE impact_log ADD COLUMN user_id uuid DEFAULT auth.uid();
UPDATE impact_log SET user_id = auth.uid() WHERE user_id IS NULL;
ALTER TABLE impact_log ALTER COLUMN user_id SET NOT NULL;

DROP POLICY IF EXISTS "anon_select_impact" ON impact_log;
DROP POLICY IF EXISTS "anon_insert_impact" ON impact_log;
DROP POLICY IF EXISTS "anon_update_impact" ON impact_log;
DROP POLICY IF EXISTS "anon_delete_impact" ON impact_log;

CREATE POLICY "user_select_impact" ON impact_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_insert_impact" ON impact_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_update_impact" ON impact_log FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_delete_impact" ON impact_log FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add user_id to disposal_events
ALTER TABLE disposal_events ADD COLUMN user_id uuid DEFAULT auth.uid();
UPDATE disposal_events SET user_id = auth.uid() WHERE user_id IS NULL;
ALTER TABLE disposal_events ALTER COLUMN user_id SET NOT NULL;

DROP POLICY IF EXISTS "anon_select_disposal" ON disposal_events;
DROP POLICY IF EXISTS "anon_insert_disposal" ON disposal_events;
DROP POLICY IF EXISTS "anon_update_disposal" ON disposal_events;
DROP POLICY IF EXISTS "anon_delete_disposal" ON disposal_events;

CREATE POLICY "user_select_disposal" ON disposal_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_insert_disposal" ON disposal_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_update_disposal" ON disposal_events FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_delete_disposal" ON disposal_events FOR DELETE TO authenticated USING (auth.uid() = user_id);
