/**
 * global-setup.ts — runs ONCE before all Playwright tests.
 *
 * 1. Cleans up leftover data from any previous crashed run
 * 2. Inserts an isolated e2e_test_pro row directly into staging Supabase
 *    via Admin API (bypasses RLS, no UI auth flow dependency)
 *
 * The local dev server (localhost:3000) connects to staging Supabase,
 * so seeding here is visible to the app under test.
 */

import { FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

export const E2E_PRO_ID    = 'e2e00000-0000-0000-0000-000000000001'
export const E2E_PRO_EMAIL = process.env.TEST_PRO_EMAIL!

const SUPABASE_URL     = process.env.STAGING_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY!

export default async function globalSetup(_config: FullConfig) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('global-setup: STAGING_SUPABASE_URL and STAGING_SUPABASE_SERVICE_ROLE_KEY are required')
  }
  if (!E2E_PRO_EMAIL) {
    throw new Error('global-setup: TEST_PRO_EMAIL is required')
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // Clean up leftover data from any previous crashed run
  await admin.from('leads').delete().eq('pro_id', E2E_PRO_ID)
  await admin.from('clients').delete().eq('pro_id', E2E_PRO_ID)
  await admin.from('pros').delete().eq('id', E2E_PRO_ID)

  // Seed the isolated e2e test pro
  const { error } = await admin.from('pros').insert({
    id:             E2E_PRO_ID,
    full_name:      'E2E Test Pro',
    email:          E2E_PRO_EMAIL,
    plan_tier:      'Free',
    profile_status: 'Active',
    city:           'Jacksonville',
    state:          'FL',
  })

  if (error) throw new Error(`global-setup: failed to seed test pro — ${error.message}`)

  console.log(`✓ global-setup: e2e test pro seeded (${E2E_PRO_EMAIL})`)
}
