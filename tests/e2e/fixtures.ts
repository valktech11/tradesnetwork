/**
 * fixtures.ts — extends Playwright base test with `authedPage`.
 *
 * Two-layer auth:
 * 1. Vercel password protection — POST to /_vercel/password to get the
 *    _vercel_password cookie. Without this every request returns 401.
 * 2. ProGuild session — GET /api/auth with test pro email, inject result
 *    into sessionStorage(pg_pro). Bypasses login UI entirely and works
 *    correctly with the app's sessionStorage-based auth (not localStorage).
 */

import { test as base, expect, Page } from '@playwright/test'

export const BASE_URL       = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
export const TEST_PRO_EMAIL = process.env.TEST_PRO_EMAIL!
const STAGING_PASSWORD      = process.env.STAGING_PASSWORD || ''

type Fixtures = { authedPage: Page }

export const test = base.extend<Fixtures>({
  authedPage: async ({ page }, use) => {

    // ── Step 1: Unlock Vercel password protection ─────────────────────────────
    // Only needed on staging (non-localhost). Submits the password form,
    // which sets a _vercel_password cookie in the browser context.
    if (!BASE_URL.includes('localhost') && STAGING_PASSWORD) {
      await page.goto(`${BASE_URL}/_vercel/password`, { waitUntil: 'domcontentloaded' })
        .catch(() => {}) // may 404 on some Vercel versions — that's fine

      // POST the password — Vercel's protection endpoint accepts form data
      await page.request.post(`${BASE_URL}/_vercel/password`, {
        form: { password: STAGING_PASSWORD },
      })

      // Navigate to root so the cookie is set in the browser context
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })

      // If still on a password gate page, fill and submit the form directly
      const passwordInput = page.locator('input[type="password"]')
      if (await passwordInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await passwordInput.fill(STAGING_PASSWORD)
        await page.locator('button[type="submit"]').click()
        await page.waitForLoadState('networkidle')
      }
    }

    // ── Step 2: Get ProGuild session from auth API ────────────────────────────
    const res = await page.request.post(`${BASE_URL}/api/auth`, {
      data: { email: TEST_PRO_EMAIL },
      headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok()) {
      throw new Error(
        `authedPage fixture: /api/auth returned ${res.status()} — ` +
        `is TEST_PRO_EMAIL (${TEST_PRO_EMAIL}) seeded in staging? ` +
        `Vercel password unlock succeeded?`
      )
    }

    const { session } = await res.json()

    // ── Step 3: Inject session into sessionStorage ────────────────────────────
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await page.evaluate((s) => {
      sessionStorage.setItem('pg_pro', JSON.stringify(s))
    }, session)

    // ── Step 4: Navigate to dashboard ────────────────────────────────────────
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    await use(page)
  },
})

export { expect }
