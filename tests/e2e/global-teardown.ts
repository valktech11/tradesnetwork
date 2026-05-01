/**
 * global-teardown.ts — runs ONCE after all Playwright tests (pass or fail).
 * Deletes all data created by the e2e test pro, then deletes the pro row.
 * Staging is always left clean.
 */

import { createClient } from '@supabase/supabase-js'
import { E2E_PRO_ID } from './global-setup'

export default async function globalTeardown() {
  const SUPABASE_URL     = process.env.STAGING_SUPABASE_URL!
  const SERVICE_ROLE_KEY = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY!

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return // local dev without creds — skip silently

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // Delete in FK-safe order
  await admin.from('leads').delete().eq('pro_id', E2E_PRO_ID)
  await admin.from('clients').delete().eq('pro_id', E2E_PRO_ID)
  await admin.from('pros').delete().eq('id', E2E_PRO_ID)

  console.log('✓ global-teardown: all e2e test data removed')
}
