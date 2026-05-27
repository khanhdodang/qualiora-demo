import { test, expect } from '@playwright/test';

test('@DEMO-TC-0005 — Pay with Visa/Mastercard (card checkout test mode)', async ({ page }) => {
  await page.goto('/payment.html');
  await page.getByTestId('card-number').fill('4111111111111111');
  await page.getByTestId('card-cvv').fill('123');
  await page.getByTestId('pay-submit').click();
  await expect(page.getByTestId('payment-ok')).toBeVisible();
});
