/**
 * global-setup.ts — runs ONCE before all Playwright tests.
 *
 * 1. Cleans up leftover data from any previous crashed run
 * 2. Inserts an isolated e2e_test_pro row into staging Supabase (Admin API,
 *    bypasses RLS — no UI auth flow, no coupling to login UI changes)
 * 3. Smoke-tests staging reachability using Vercel password auth
 */

import { chromium, FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

export const E2E_PRO_ID    = 'e2e00000-0000-0000-0000-000000000001'
export const E2E_PRO_EMAIL = process.env.TEST_PRO_EMAIL!

const SUPABASE_URL     = process.env.STAGING_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY!
const STAGING_URL      = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const STAGING_PASSWORD = process.env.STAGING_PASSWORD || ''

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

  // ── 1. Clean up leftover data from any previous crashed run ─────────────────
  await admin.from('leads').delete().eq('pro_id', E2E_PRO_ID)
  await admin.from('clients').delete().eq('pro_id', E2E_PRO_ID)
  await admin.from('pros').delete().eq('id', E2E_PRO_ID)

  // ── 2. Seed the e2e test pro ─────────────────────────────────────────────────
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

  // ── 3. Smoke test — verify staging is reachable after password auth ──────────
  if (STAGING_URL.startsWith('http') && !STAGING_URL.includes('localhost')) {
    const browser = await chromium.launch()
    const ctx     = await browser.newContext()
    const page    = await ctx.newPage()

    // Unlock Vercel password protection via API POST
    await page.request.post(`${STAGING_URL}/_vercel/password`, {
      form: { password: STAGING_PASSWORD },
    })

    const res = await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 })

    // Fallback: if password gate rendered as HTML form, fill and submit it
    const pwInput = page.locator('input[type="password"]')
    if (await pwInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await pwInput.fill(STAGING_PASSWORD)
      await page.locator('button[type="submit"]').click()
      await page.waitForLoadState('networkidle')
    }

    const status = res?.status()
    await browser.close()

    if (status === 401) {
      throw new Error(
        `global-setup: staging still 401 after password auth — ` +
        `check STAGING_PASSWORD secret matches Vercel STAGING_PASSWORD env var.\n` +
        `URL: ${STAGING_URL}`
      )
    }
  }

  console.log(`✓ global-setup: e2e test pro seeded (${E2E_PRO_EMAIL})`)
}
