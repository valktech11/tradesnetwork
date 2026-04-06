-- Add stored avg_rating and review_count columns to pros table
-- Run in Supabase SQL Editor

ALTER TABLE pros ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,1) DEFAULT 0;
ALTER TABLE pros ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE pros ADD COLUMN IF NOT EXISTS lead_count INTEGER DEFAULT 0;

-- Backfill existing data from reviews
UPDATE pros p SET
  avg_rating   = COALESCE((SELECT ROUND(AVG(r.rating)::NUMERIC, 1) FROM reviews r WHERE r.pro_id = p.id AND r.is_approved), 0),
  review_count = COALESCE((SELECT COUNT(*) FROM reviews r WHERE r.pro_id = p.id AND r.is_approved), 0),
  lead_count   = COALESCE((SELECT COUNT(*) FROM leads l WHERE l.pro_id = p.id), 0);

-- Auto-update avg_rating and review_count when a review is approved/added
CREATE OR REPLACE FUNCTION refresh_pro_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE pros SET
    avg_rating   = COALESCE((SELECT ROUND(AVG(r.rating)::NUMERIC, 1) FROM reviews r WHERE r.pro_id = NEW.pro_id AND r.is_approved), 0),
    review_count = COALESCE((SELECT COUNT(*) FROM reviews r WHERE r.pro_id = NEW.pro_id AND r.is_approved), 0)
  WHERE id = NEW.pro_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reviews_update_pro_stats
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION refresh_pro_stats();

-- Auto-update lead_count when a lead is added
CREATE OR REPLACE FUNCTION refresh_pro_lead_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE pros SET
    lead_count = COALESCE((SELECT COUNT(*) FROM leads l WHERE l.pro_id = NEW.pro_id), 0)
  WHERE id = NEW.pro_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_update_pro_stats
  AFTER INSERT OR DELETE ON leads
  FOR EACH ROW EXECUTE FUNCTION refresh_pro_lead_count();

-- Create indexes for sorting
CREATE INDEX IF NOT EXISTS idx_pros_avg_rating   ON pros(avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_pros_review_count ON pros(review_count DESC);
CREATE INDEX IF NOT EXISTS idx_pros_yrs_exp      ON pros(years_experience DESC);
