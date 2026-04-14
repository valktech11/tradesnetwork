# DCN Pro Importer — Run Instructions

## What it does
Imports all 16,095 contractor records from DCN Online XLSX exports into the TradesNetwork `pros` table.
- Deduplicates by email across all 29 trade files
- Extracts license numbers from Services field
- Writes to `pro_licenses` table for multi-license contractors
- Maps DCN trade names → TradesNetwork trade categories
- Stores real email (needed for claim campaigns)
- Marks all records as `is_claimed = false` so they can't log in until claimed

## Setup (one time)

```bash
cd tradesnetwork-tools
npm install xlsx @supabase/supabase-js
mkdir dcn-data
```

Copy all 29 DCN XLSX files into `./dcn-data/`:
- AirCondition.xlsx, AlarmContractor.xlsx, Building.xlsx, Building Demolition.xlsx
- carpenter.xlsx, DoorAndWindows.xlsx, DryWall.xlsx, ElectriContractor.xlsx
- Flooring.xlsx, GasLine.xlsx, GeneralContractor.xlsx, GlassAndGlazing.xlsx
- Gutters.xlsx, GypsumDryWall.xlsx, IndustrialFacility.xlsx, IrrigationFacility.xlsx
- MarineAndMechanical.xlsx, Painting.xlsx, plumbing.xlsx
- PollutantSTorageSystemAndPoolSpa.xlsx, Residental.xlsx
- ResidentialPoolSpaServiceAndResidentialSolarWaterHeating.xlsx
- Roofing.xlsx, ScreeningAndSheetMetail.xlsx, Shutters.xlsx, Solar.xlsx
- Speciality.xlsx, StructureContractor.xlsx, TowerAndUndergroundUtilityAndExcavation.xlsx

## Run

```bash
# ALWAYS dry run first — no DB writes, just preview
node import-dcn-pros.js --dry-run --fl-only

# Full import — FL records only (recommended)
node import-dcn-pros.js --fl-only

# Full import including out-of-state licensed contractors
node import-dcn-pros.js

# Single file test
node import-dcn-pros.js --dry-run --file carpenter.xlsx
```

## Expected output
- ~6,140 unique pros inserted (deduped by email across all files)
- ~9,955 skipped (duplicates across trade files)
- ~1,513 out-of-state skipped if using --fl-only

## After import
Run the dedup SQL in Supabase SQL Editor to remove duplicate DBPR placeholder records:

```sql
-- Find DBPR pros duplicated by DCN (matched by license_number)
SELECT p1.id as dbpr_id, p1.email as dbpr_email,
       p2.id as dcn_id, p2.email as dcn_email,
       p1.license_number
FROM pros p1
JOIN pros p2 ON p1.license_number = p2.license_number AND p1.id <> p2.id
WHERE p1.email LIKE 'unclaimed_%@placeholder.tradesnetwork'
  AND p2.email NOT LIKE '%@placeholder.tradesnetwork'
  AND p1.license_number IS NOT NULL;

-- After reviewing results, delete DBPR duplicates
DELETE FROM pros
WHERE id IN (
  SELECT p1.id FROM pros p1
  JOIN pros p2 ON p1.license_number = p2.license_number AND p1.id <> p2.id
  WHERE p1.email LIKE 'unclaimed_%@placeholder.tradesnetwork'
    AND p2.email NOT LIKE '%@placeholder.tradesnetwork'
    AND p1.license_number IS NOT NULL
);
```

## Vercel env vars needed (Stripe — add to Vercel dashboard)
```
STRIPE_SECRET_KEY=sk_live_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxx
STRIPE_PRICE_PRO_FOUNDING=price_xxxx
STRIPE_PRICE_ELITE_FOUNDING=price_xxxx
STRIPE_PRICE_PRO_FOUNDING_ANNUAL=price_xxxx
STRIPE_PRICE_ELITE_FOUNDING_ANNUAL=price_xxxx
STRIPE_PRICE_PRO=price_xxxx
STRIPE_PRICE_ELITE=price_xxxx
STRIPE_PRICE_PRO_ANNUAL=price_xxxx
STRIPE_PRICE_ELITE_ANNUAL=price_xxxx
```

## Stripe setup checklist
1. Create products in Stripe Dashboard → Products
2. Create prices for each plan (Pro Founding $19/mo, Elite Founding $39/mo, etc.)
3. Copy each price_xxxx ID into Vercel env vars above
4. Add webhook endpoint in Stripe Dashboard:
   URL: https://tradesnetwork.vercel.app/api/stripe/webhook
   Events to listen for:
   - checkout.session.completed
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_failed
5. Copy webhook signing secret → STRIPE_WEBHOOK_SECRET in Vercel
