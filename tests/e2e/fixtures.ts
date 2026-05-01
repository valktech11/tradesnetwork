/**
 * fixtures.ts — extends Playwright base test with `authedPage`.
 *
 * WHY: Playwright's built-in storageState only saves localStorage.
 * ProGuild uses sessionStorage (key: pg_pro). storageState therefore never
 * restores the session and every test hits the /login redirect.
 *
 * FIX: Call /api/auth with the test pro email to get a real Session object,
 * inject it into sessionStorage via page.evaluate, then navigate to /dashboard.
 * Every test gets a fully authenticated page — no login UI dependency.
 */

import { test as base, expect, Page } from '@playwright/test'

export const BASE_URL       = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
export const TEST_PRO_EMAIL = process.env.TEST_PRO_EMAIL!

type Fixtures = { authedPage: Page }

export const test = base.extend<Fixtures>({
  authedPage: async ({ page }, use) => {
    // 1. Get a real Session from the auth API (same call the login page makes)
    const res = await page.request.post(`${BASE_URL}/api/auth`, {
      data: { email: TEST_PRO_EMAIL },
      headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok()) {
      throw new Error(
        `authedPage fixture: /api/auth returned ${res.status()} — ` +
        `is TEST_PRO_EMAIL (${TEST_PRO_EMAIL}) seeded in staging?`
      )
    }

    const { session } = await res.json()

    // 2. Navigate to any stable page on the origin to unlock sessionStorage
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // 3. Inject session into sessionStorage — this is what every CRM page reads
    await page.evaluate((s) => {
      sessionStorage.setItem('pg_pro', JSON.stringify(s))
    }, session)

    // 4. Navigate to dashboard — should stay on /dashboard (not redirect to /login)
    await page.goto('/dashboard', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    await use(page)
  },
})

export { expect }
