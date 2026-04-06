-- Trade stats view — run in Supabase SQL Editor
-- Shows pro count per trade category

CREATE OR REPLACE VIEW trade_stats AS
SELECT
  tc.id,
  tc.category_name,
  tc.slug,
  COUNT(p.id) AS pro_count,
  COUNT(p.id) FILTER (WHERE p.plan_tier != 'Free') AS paid_count,
  COUNT(p.id) FILTER (WHERE p.is_verified = true) AS verified_count
FROM trade_categories tc
LEFT JOIN pros p
  ON p.trade_category_id = tc.id
  AND p.profile_status = 'Active'
GROUP BY tc.id, tc.category_name, tc.slug
ORDER BY pro_count DESC;
