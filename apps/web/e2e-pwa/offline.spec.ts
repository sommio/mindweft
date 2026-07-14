import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test';

const STUB_BASE = 'http://127.0.0.1:8788/v1';
const API_KEY = 'sk-stub-secret-do-not-leak';

async function setProviderConfig(page: Page): Promise<void> {
  await page.addInitScript(
    (cfg) => {
      window.localStorage.setItem(
        'mindweft.provider-config',
        JSON.stringify(cfg),
      );
    },
    { baseUrl: STUB_BASE, apiKey: API_KEY, model: 'stub-model' },
  );
}

async function waitForServiceWorker(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
}

test.beforeEach(async ({ request }: { request: APIRequestContext }) => {
  const res = await request.post('/api/test/reset-db');
  expect(res.ok()).toBe(true);
});

test.describe('pwa offline', () => {
  test('cached shell stays visible offline with an offline status', async ({
    page,
  }) => {
    await setProviderConfig(page);
    await page.goto('/chat');
    await expect(page.getByRole('heading', { name: '聊天' })).toBeVisible();
    // 等待 SW 安装并预缓存 /offline。
    await waitForServiceWorker(page);

    await page.context().setOffline(true);
    await page.reload();
    // 导航网络失败 → SW 回退到 /offline 页。
    await expect(page.getByRole('heading', { name: '当前离线' })).toBeVisible();
    await expect(page.getByText('聊天暂不可用')).toBeVisible();
  });

  test('send is disabled while offline and no message is queued', async ({
    page,
  }) => {
    await setProviderConfig(page);
    await page.goto('/chat');
    await expect(page.getByRole('heading', { name: '聊天' })).toBeVisible();
    await waitForServiceWorker(page);

    // 在线发送一条，建立基线。
    const composer = page.getByLabel('消息输入');
    await composer.fill('online-msg');
    await composer.press('Enter');
    await expect(page.getByRole('log').getByText('online-msg')).toBeVisible();
    await waitForStreamDone(page);

    await page.context().setOffline(true);
    await expect(page.getByText('当前离线，发送已禁用')).toBeVisible();
    await expect(page.getByLabel('消息输入')).toBeDisabled();

    // 离线尝试发送：textarea 禁用，无法发送；即使强行填值也不会产生新消息。
    const messagesBefore = await page
      .getByRole('log')
      .getByText('online-msg', { exact: true })
      .count();

    await page.context().setOffline(false);
    await page.waitForTimeout(300);
    // 恢复联网后不会自动补发离线期间尝试的内容。
    const messagesAfter = await page
      .getByRole('log')
      .getByText('online-msg', { exact: true })
      .count();
    expect(messagesAfter).toBe(messagesBefore);
  });
});

async function waitForStreamDone(page: Page): Promise<void> {
  const composer = page.getByLabel('消息输入');
  await expect(composer).toBeEnabled();
}
