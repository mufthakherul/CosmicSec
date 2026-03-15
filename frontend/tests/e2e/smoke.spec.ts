import { test, expect } from '@playwright/test';

test('dashboard loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('CosmicSec Admin Dashboard')).toBeVisible();
});
