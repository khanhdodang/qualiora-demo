import { test, expect } from '@playwright/test';

test('@DEMO-TC-0004 — Reject expired promo codes', async ({ page }) => {
  await page.goto('/promo.html');
  await page.getByTestId('promo-code').fill('EXPIRED');
  await page.getByTestId('apply-promo').click();
  await expect(page.getByTestId('promo-error')).toBeVisible();
  await expect(page.getByTestId('promo-success')).toBeHidden();
});
