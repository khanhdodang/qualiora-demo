import { test, expect } from '@playwright/test';

test('@DEMO-TC-0001 — User can sign in with email and password', async ({ page }) => {
  await page.goto('/login.html');
  await page.getByTestId('email').fill('buyer@example.com');
  await page.getByTestId('password').fill('demo-password');
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('welcome')).toBeVisible();
});
