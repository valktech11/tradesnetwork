-- ============================================================
-- Admin Role Setup
-- Run in Supabase SQL Editor FIRST before deploying v21
-- ============================================================

-- 1. Add is_admin column to pros table
ALTER TABLE pros ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- 2. Mark your account as admin
UPDATE pros SET is_admin = true WHERE email = 'valktech11@gmail.com';

-- 3. Site config table for maintenance mode, pricing, feature flags
CREATE TABLE IF NOT EXISTS site_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Seed default config values
INSERT INTO site_config (key, value) VALUES
  ('maintenance_mode',    'false'),
  ('maintenance_message', 'We are performing scheduled maintenance. We will be back shortly.'),
  ('maintenance_type',    'info'),
  ('upgrades_enabled',    'true'),
  ('price_pro_monthly',   '29'),
  ('price_elite_monthly', '59'),
  ('price_pro_annual',    '190'),
  ('price_elite_annual',  '390'),
  ('price_pro_founding',  '19'),
  ('price_elite_founding','39'),
  ('platform_name',       'TradesNetwork'),
  ('support_email',       'hello@tradesnetwork.com')
ON CONFLICT (key) DO NOTHING;

-- 5. RLS — site_config readable by all, writable by service role only
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_config_public_read" ON site_config FOR SELECT USING (true);

-- 6. Job alerts table (for email notifications when jobs posted)
CREATE TABLE IF NOT EXISTS job_alerts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pro_id       UUID NOT NULL REFERENCES pros(id) ON DELETE CASCADE,
  trade_category_id UUID REFERENCES trade_categories(id),
  city         TEXT,
  state        TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pro_id, trade_category_id, city)
);

ALTER TABLE job_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "job_alerts_read" ON job_alerts FOR SELECT USING (true);

-- Verify admin was set
SELECT id, full_name, email, is_admin FROM pros WHERE email = 'valktech11@gmail.com';
