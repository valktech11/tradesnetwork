-- ============================================================
-- v26 Schema Additions
-- Run in Supabase SQL Editor before deploying v26
-- ============================================================

-- 1. Business name + multiple phone types on pros
ALTER TABLE pros ADD COLUMN IF NOT EXISTS business_name       TEXT;
ALTER TABLE pros ADD COLUMN IF NOT EXISTS phone_cell          TEXT;
ALTER TABLE pros ADD COLUMN IF NOT EXISTS phone_work          TEXT;
ALTER TABLE pros ADD COLUMN IF NOT EXISTS phone_cell2         TEXT;
ALTER TABLE pros ADD COLUMN IF NOT EXISTS counties_served     TEXT[];
ALTER TABLE pros ADD COLUMN IF NOT EXISTS address_line1       TEXT;

-- 2. Multiple licenses per pro
CREATE TABLE IF NOT EXISTS pro_licenses (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pro_id              UUID NOT NULL REFERENCES pros(id) ON DELETE CASCADE,
  trade_name          TEXT NOT NULL,
  license_number      TEXT NOT NULL,
  license_expiry_date DATE,
  license_status      TEXT DEFAULT 'unknown'
                      CHECK (license_status IN ('active','expiring_soon','expired','unknown')),
  is_primary          BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pro_id, license_number)
);
ALTER TABLE pro_licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pro_licenses_read"   ON pro_licenses FOR SELECT USING (true);
CREATE POLICY "pro_licenses_insert" ON pro_licenses FOR INSERT WITH CHECK (true);
CREATE POLICY "pro_licenses_update" ON pro_licenses FOR UPDATE USING (true);
CREATE POLICY "pro_licenses_delete" ON pro_licenses FOR DELETE USING (true);

-- 3. Memberships / associations
CREATE TABLE IF NOT EXISTS pro_memberships (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pro_id     UUID NOT NULL REFERENCES pros(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  url        TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pro_id, name)
);
ALTER TABLE pro_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "memberships_read"   ON pro_memberships FOR SELECT USING (true);
CREATE POLICY "memberships_insert" ON pro_memberships FOR INSERT WITH CHECK (true);
CREATE POLICY "memberships_delete" ON pro_memberships FOR DELETE USING (true);

-- 4. New trade categories (Item 4 — consolidate DCN trades)
INSERT INTO trade_categories (category_name, slug) VALUES
  ('Drywall & Plastering',    'drywall'),
  ('Roofing',                 'roofing'),
  ('Windows & Doors',         'windows-doors'),
  ('Gutters',                 'gutters'),
  ('Glass & Glazing',         'glass-glazing'),
  ('Alarm & Security',        'alarm-security'),
  ('Irrigation',              'irrigation'),
  ('Marine Contractor',       'marine-contractor'),
  ('Screening & Sheet Metal', 'screening-sheet-metal'),
  ('Solar Energy',            'solar-energy'),
  ('Structural Contractor',   'structural-contractor'),
  ('Industrial Facility',     'industrial-facility'),
  ('Pool & Spa',              'pool-spa'),
  ('Other Trades',            'other-trades')
ON CONFLICT (slug) DO NOTHING;

-- Verify
SELECT 'v26 schema ready' as status, COUNT(*) as trade_category_count FROM trade_categories;
