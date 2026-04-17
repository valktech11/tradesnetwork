-- ── v35 schema additions ──────────────────────────────────────────────────────

-- 1. Cover image on pros
ALTER TABLE pros ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- 2. Profile view counter
ALTER TABLE pros ADD COLUMN IF NOT EXISTS profile_view_count INT DEFAULT 0;

-- 3. Before/After on portfolio items
ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS before_photo_url  TEXT;
ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS is_before_after   BOOLEAN DEFAULT false;

-- 4. Trade categories active flag
ALTER TABLE trade_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 5. Cron email dedup log
CREATE TABLE IF NOT EXISTS cron_email_log (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pro_id     UUID REFERENCES pros(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cron_log_pro_type ON cron_email_log(pro_id, alert_type, sent_at);

SELECT 'v35 schema ready' as status;
