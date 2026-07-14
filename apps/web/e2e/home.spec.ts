import { expect, test } from '@playwright/test';

test('redirects / to /chat empty state', async ({ page }) => {
  await page.goto('/');
  await page.waitForURL('**/chat');
  await expect(page.getByRole('heading', { name: '聊天' })).toBeVisible();
  await expect(page.getByText('先连接一个 Provider。')).toBeVisible();
  await expect(
    page.getByRole('link', { name: '去配置 Provider' }),
  ).toBeVisible();
});
