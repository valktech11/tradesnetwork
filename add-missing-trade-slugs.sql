-- Run this in Supabase SQL Editor
-- Inserts missing trade categories that appear on the homepage but may not exist in DB
-- Uses INSERT ... ON CONFLICT DO NOTHING so safe to run multiple times

INSERT INTO trade_categories (category_name, slug, is_active)
VALUES
  ('Impact Window & Shutter Installer', 'impact-window-shutter', true),
  ('Gas Fitter',                        'gas-fitter',            true),
  ('Fire Sprinkler Technician',         'fire-sprinkler',        true),
  ('Concrete Contractor',               'concrete-contractor',   true),
  ('Foundation Specialist',             'foundation-specialist', true),
  ('Insulation Contractor',             'insulation-contractor', true),
  ('Low-Voltage / AV Installer',        'low-voltage',           true),
  ('Marine / Dock Builder',             'marine-contractor',     true),
  ('Septic & Drain Specialist',         'septic-drain',          true),
  ('Elevator Technician',               'elevator-technician',   true),
  ('Home Inspector',                    'home-inspector',        true)
ON CONFLICT (slug) DO NOTHING;

-- Verify — should return the inserted rows
SELECT category_name, slug, is_active
FROM trade_categories
WHERE slug IN (
  'impact-window-shutter','gas-fitter','fire-sprinkler',
  'concrete-contractor','foundation-specialist','insulation-contractor',
  'low-voltage','marine-contractor','septic-drain','elevator-technician',
  'home-inspector'
)
ORDER BY slug;
