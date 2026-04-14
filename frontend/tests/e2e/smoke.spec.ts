import { test, expect } from '@playwright/test';

test('landing loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Universal Cybersecurity Intelligence Platform')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start Free' })).toBeVisible();
});
