import { test, expect } from '@playwright/test';

test('@DEMO-TC-0002 — Guest checkout without account', async ({ page }) => {
  await page.goto('/guest-checkout.html');
  await expect(page.getByTestId('cart-count')).toContainText('1 item');
  await page.getByTestId('guest-continue').click();
  await expect(page.getByTestId('guest-confirmed')).toBeVisible();
});
