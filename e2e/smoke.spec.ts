import { expect, test } from '@playwright/test';

test('landing renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Template');
});
