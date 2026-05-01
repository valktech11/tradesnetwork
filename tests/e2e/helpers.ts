import { Page } from '@playwright/test'

export const TEST_PRO_EMAIL = process.env.TEST_PRO_EMAIL || 'test@proguild.ai'

/**
 * Log in as the test pro and set session in sessionStorage.
 * Uses the /api/auth endpoint directly — faster than UI login flow.
 */
export async function loginAsTestPro(page: Page) {
  const baseURL = page.context().browser()?.browserType().name() ? page.url() : 'http://localhost:3000'

  // Navigate to any page first so we have a context to set storage
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  // Call auth API directly
  const res = await page.request.post('/api/auth', {
    data: { email: TEST_PRO_EMAIL },
  })

  if (!res.ok()) {
    throw new Error(`Auth failed: ${res.status()} — is ${TEST_PRO_EMAIL} in staging DB?`)
  }

  const { session } = await res.json()

  // Set session in sessionStorage (matches what the app reads)
  await page.evaluate((s) => {
    sessionStorage.setItem('pg_pro', JSON.stringify(s))
  }, session)

  return session
}

/**
 * Navigate to dashboard after login — waits for content to load.
 */
export async function goToDashboard(page: Page) {
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
}

/**
 * Navigate to pipeline page.
 */
export async function goToPipeline(page: Page) {
  await page.goto('/dashboard/pipeline')
  await page.waitForLoadState('networkidle')
}
