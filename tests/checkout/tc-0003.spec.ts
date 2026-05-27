import { test, expect } from '@playwright/test';

test('@DEMO-TC-0003 — Apply valid promo code at checkout', async ({ page }) => {
  await page.goto('/promo.html');
  await page.getByTestId('promo-code').fill('SAVE10');
  await page.getByTestId('apply-promo').click();
  await expect(page.getByTestId('promo-success')).toBeVisible();
});
