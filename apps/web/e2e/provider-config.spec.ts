import { expect, test } from '@playwright/test';

const BASE_URL = 'http://localhost:11434';
const API_KEY = 'sk-test-secret-key';
const MODEL = 'gpt-4o';

async function gotoSettings(page: import('@playwright/test').Page) {
  await page.goto('/settings/provider');
  await expect(
    page.getByRole('heading', { name: 'Provider 设置' }),
  ).toBeVisible();
}

async function fillValidConfig(page: import('@playwright/test').Page) {
  await page.getByLabel('Base URL').fill(BASE_URL);
  await page.getByLabel('API Key').fill(API_KEY);
  await page.getByLabel('Model').fill(MODEL);
}

test.describe('provider config', () => {
  test('empty /chat guides to provider settings', async ({ page }) => {
    await page.goto('/chat');
    await expect(page.getByText('先连接一个 Provider。')).toBeVisible();
    await page.getByRole('link', { name: '去配置 Provider' }).click();
    await page.waitForURL('**/settings/provider');
    await expect(
      page.getByRole('heading', { name: 'Provider 设置' }),
    ).toBeVisible();
  });

  test('saves valid config and reaches ready chat state', async ({ page }) => {
    await gotoSettings(page);
    await fillValidConfig(page);
    await page.getByRole('button', { name: '保存' }).click();

    await expect(page.getByRole('status').getByText('已保存')).toBeVisible();
    await page
      .getByRole('status')
      .getByRole('link', { name: '返回聊天' })
      .click();
    await page.waitForURL('**/chat');
    await expect(page.getByText(`Model 为 ${MODEL}`)).toBeVisible();
    await expect(
      page.getByRole('link', { name: '编辑 Provider' }),
    ).toBeVisible();
  });

  test('config persists after refresh', async ({ page }) => {
    await gotoSettings(page);
    await fillValidConfig(page);
    await page.getByRole('button', { name: '保存' }).click();

    await page.reload();
    await expect(page.getByLabel('Base URL')).toHaveValue(BASE_URL);
    await expect(page.getByLabel('Model')).toHaveValue(MODEL);

    await page.goto('/chat');
    await expect(page.getByText(`Model 为 ${MODEL}`)).toBeVisible();
  });

  test('modifying model reflects in chat', async ({ page }) => {
    await gotoSettings(page);
    await fillValidConfig(page);
    await page.getByRole('button', { name: '保存' }).click();

    await page.getByLabel('Model').fill('gpt-4o-mini');
    await page.getByRole('button', { name: '保存' }).click();

    await page.goto('/chat');
    await expect(page.getByText('Model 为 gpt-4o-mini')).toBeVisible();
  });

  test('clearing local config returns chat to empty state', async ({
    page,
  }) => {
    await gotoSettings(page);
    await fillValidConfig(page);
    await page.getByRole('button', { name: '保存' }).click();

    await page.getByRole('button', { name: '清除本地配置' }).click();
    await expect(page.getByLabel('Base URL')).toHaveValue('');
    await expect(page.getByLabel('API Key')).toHaveValue('');
    await expect(page.getByLabel('Model')).toHaveValue('');

    await page.goto('/chat');
    await expect(page.getByText('先连接一个 Provider。')).toBeVisible();
  });

  test('rejects unsupported scheme base url', async ({ page }) => {
    await gotoSettings(page);
    await page.getByLabel('Base URL').fill('ftp://example.com');
    await page.getByLabel('API Key').fill(API_KEY);
    await page.getByLabel('Model').fill(MODEL);
    await page.getByRole('button', { name: '保存' }).click();

    await expect(page.getByText('Base URL 仅支持 http 或 https')).toBeVisible();
    await expect(page.getByRole('status').getByText('已保存')).toHaveCount(0);
  });

  test('rejects embedded credentials in base url', async ({ page }) => {
    await gotoSettings(page);
    await page.getByLabel('Base URL').fill('https://user:pass@example.com');
    await page.getByLabel('API Key').fill(API_KEY);
    await page.getByLabel('Model').fill(MODEL);
    await page.getByRole('button', { name: '保存' }).click();

    await expect(page.getByText('Base URL 不能内嵌用户名密码')).toBeVisible();
  });

  test('rejects fragment in base url', async ({ page }) => {
    await gotoSettings(page);
    await page.getByLabel('Base URL').fill('https://example.com#sec');
    await page.getByLabel('API Key').fill(API_KEY);
    await page.getByLabel('Model').fill(MODEL);
    await page.getByRole('button', { name: '保存' }).click();

    await expect(page.getByText('Base URL 不能包含 fragment')).toBeVisible();
  });

  test('rejects empty api key and model', async ({ page }) => {
    await gotoSettings(page);
    await page.getByLabel('Base URL').fill(BASE_URL);
    await page.getByRole('button', { name: '保存' }).click();

    await expect(page.getByText('请填写 API Key')).toBeVisible();
    await expect(page.getByText('请填写 Model')).toBeVisible();
  });

  test('api key is masked and can be revealed', async ({ page }) => {
    await gotoSettings(page);
    const apiKeyInput = page.getByLabel('API Key');
    await expect(apiKeyInput).toHaveAttribute('type', 'password');
    await apiKeyInput.fill(API_KEY);
    await page.getByRole('button', { name: '显示' }).click();
    await expect(apiKeyInput).toHaveAttribute('type', 'text');
    await expect(apiKeyInput).toHaveValue(API_KEY);
  });

  test('does not send api key to the app server', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('127.0.0.1') || url.includes('localhost')) {
        requests.push(`${request.method()} ${url}`);
      }
    });

    await gotoSettings(page);
    await fillValidConfig(page);
    await page.getByRole('button', { name: '保存' }).click();
    await expect(page.getByRole('status').getByText('已保存')).toBeVisible();

    const leaky = requests.filter((entry) => entry.includes(API_KEY));
    expect(leaky).toEqual([]);
  });
});
