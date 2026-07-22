/*
# Intelligent Dietary System (IDS) — Core Schema

## Purpose
Single-tenant (no auth) persistence for the Intelligent Dietary System.
The app runs entirely client-side; Supabase only syncs the user's inventory,
profile, and sustainability impact metrics across devices.

## New Tables

1. `inventory_items` — food items detected/scanned or manually added.
   - id (uuid pk)
   - name (text)
   - category (text) — e.g. leafy_green, root, fruit, dairy, protein, grain
   - quantity (numeric, default 1)
   - unit (text, default 'unit')
   - added_at (timestamptz)
   - expires_at (timestamptz) — computed from shelf-life at add time
   - freshness_score (real 0..1) — client-side ripeness estimate from scanner
   - notes (text, nullable)

2. `user_profile` — single row holding the local RDA personalization inputs.
   - id (uuid pk)
   - age (int)
   - sex (text) — 'male' | 'female'
   - weight_kg (real)
   - height_cm (real)
   - activity_level (text) — 'sedentary'|'light'|'moderate'|'active'|'very_active'
   - conditions (text[]) — therapeutic restrictions e.g. ['hypertension','diabetes']
   - updated_at (timestamptz)

3. `impact_log` — append-only event log for sustainability gamification.
   - id (uuid pk)
   - event_type (text) — 'rescue_meal'|'item_discarded'|'item_consumed'
   - co2e_kg (real) — CO2 equivalent kg avoided or emitted
   - payload (jsonb) — flexible detail (recipe name, item, etc.)
   - created_at (timestamptz)

4. `disposal_events` — raw disposal records for predictive behavioral analytics.
   - id (uuid pk)
   - item_name (text)
   - category (text)
   - reason (text) — 'expired'|'spoiled'|'overpurchased'|'other'
   - created_at (timestamptz)

## Security
- RLS enabled on all tables.
- Single-tenant, no auth: anon + authenticated CRUD allowed (data is intentionally
  shared/public on this free-tier single-user instance).
*/

CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'unit',
  added_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  freshness_score real DEFAULT 1.0,
  notes text
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_inventory" ON inventory_items;
CREATE POLICY "anon_select_inventory" ON inventory_items FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_inventory" ON inventory_items;
CREATE POLICY "anon_insert_inventory" ON inventory_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_inventory" ON inventory_items;
CREATE POLICY "anon_update_inventory" ON inventory_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_inventory" ON inventory_items;
CREATE POLICY "anon_delete_inventory" ON inventory_items FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS user_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  age int NOT NULL DEFAULT 30,
  sex text NOT NULL DEFAULT 'female',
  weight_kg real NOT NULL DEFAULT 70,
  height_cm real NOT NULL DEFAULT 170,
  activity_level text NOT NULL DEFAULT 'moderate',
  conditions text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_profile" ON user_profile;
CREATE POLICY "anon_select_profile" ON user_profile FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_profile" ON user_profile;
CREATE POLICY "anon_insert_profile" ON user_profile FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_profile" ON user_profile;
CREATE POLICY "anon_update_profile" ON user_profile FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_profile" ON user_profile;
CREATE POLICY "anon_delete_profile" ON user_profile FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS impact_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  co2e_kg real NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE impact_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_impact" ON impact_log;
CREATE POLICY "anon_select_impact" ON impact_log FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_impact" ON impact_log;
CREATE POLICY "anon_insert_impact" ON impact_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_impact" ON impact_log;
CREATE POLICY "anon_update_impact" ON impact_log FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_impact" ON impact_log;
CREATE POLICY "anon_delete_impact" ON impact_log FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS disposal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  reason text NOT NULL DEFAULT 'expired',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE disposal_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_disposal" ON disposal_events;
CREATE POLICY "anon_select_disposal" ON disposal_events FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_disposal" ON disposal_events;
CREATE POLICY "anon_insert_disposal" ON disposal_events FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_disposal" ON disposal_events;
CREATE POLICY "anon_update_disposal" ON disposal_events FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_disposal" ON disposal_events;
CREATE POLICY "anon_delete_disposal" ON disposal_events FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_inventory_expires ON inventory_items(expires_at);
CREATE INDEX IF NOT EXISTS idx_impact_created ON impact_log(created_at);
CREATE INDEX IF NOT EXISTS idx_disposal_created ON disposal_events(created_at);
