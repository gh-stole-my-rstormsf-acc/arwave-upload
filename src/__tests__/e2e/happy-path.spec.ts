import { test, expect } from '@playwright/test';

test('renders upload shell and critical controls', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'ARWave Upload' })).toBeVisible();
  await expect(page.getByText('Target network')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pay in ETH and Upload' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ENS Linking' })).toBeVisible();
});
