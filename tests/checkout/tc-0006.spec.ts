import { test, expect } from '@playwright/test';

test('@DEMO-TC-0006 — Display order summary before payment', async ({ page }) => {
  await page.goto('/summary.html');
  await expect(page.getByTestId('order-summary')).toBeVisible();
  await expect(page.getByTestId('order-total')).toHaveText('$79.00');
  await expect(page.getByTestId('shipping-estimate')).toContainText('Estimated delivery');
});
