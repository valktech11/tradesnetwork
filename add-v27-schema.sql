-- ============================================================
-- v27 Schema Additions
-- Run in Supabase SQL Editor before deploying v27
-- ============================================================

-- 1. COI / Certificate of Insurance
CREATE TABLE IF NOT EXISTS pro_insurance (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pro_id           UUID NOT NULL REFERENCES pros(id) ON DELETE CASCADE,
  file_url         TEXT NOT NULL,
  insurer_name     TEXT,
  policy_number    TEXT,
  coverage_type    TEXT,
  expiry_date      DATE,
  insurance_status TEXT DEFAULT 'unknown'
                   CHECK (insurance_status IN ('active','expiring_soon','expired','unknown')),
  extracted_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE pro_insurance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insurance_read"   ON pro_insurance FOR SELECT USING (true);
CREATE POLICY "insurance_insert" ON pro_insurance FOR INSERT WITH CHECK (true);
CREATE POLICY "insurance_update" ON pro_insurance FOR UPDATE USING (true);
CREATE POLICY "insurance_delete" ON pro_insurance FOR DELETE USING (true);

-- Add insurance fields to pros for quick badge display
ALTER TABLE pros ADD COLUMN IF NOT EXISTS insurance_status      TEXT DEFAULT 'unknown'
  CHECK (insurance_status IN ('active','expiring_soon','expired','unknown'));
ALTER TABLE pros ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE;

-- 2. Geo-tagging on portfolio items
ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS latitude      DOUBLE PRECISION;
ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS longitude     DOUBLE PRECISION;
ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS location_label TEXT;
ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS captured_at   TIMESTAMPTZ;
ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS is_job_site   BOOLEAN DEFAULT false;

-- 3. Storage bucket for insurance docs (run separately if needed)
INSERT INTO storage.buckets (id, name, public)
VALUES ('insurance', 'insurance', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "insurance_docs_upload" ON storage.objects;
DROP POLICY IF EXISTS "insurance_docs_read"   ON storage.objects;
CREATE POLICY "insurance_docs_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'insurance');
CREATE POLICY "insurance_docs_read"   ON storage.objects FOR SELECT USING (bucket_id = 'insurance');

SELECT 'v27 schema ready' as status;
