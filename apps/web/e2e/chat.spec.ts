import { expect, test, type Page } from '@playwright/test';

const STUB_BASE = 'http://127.0.0.1:8787/v1';
const API_KEY = 'sk-stub-secret-do-not-leak';

async function setProviderConfig(page: Page, model: string): Promise<void> {
  await page.addInitScript(
    (cfg) => {
      window.localStorage.setItem(
        'mindweft.provider-config',
        JSON.stringify(cfg),
      );
    },
    { baseUrl: STUB_BASE, apiKey: API_KEY, model },
  );
}

async function gotoChat(page: Page, model = 'stub-model'): Promise<void> {
  await setProviderConfig(page, model);
  await page.goto('/chat');
  await expect(page.getByRole('heading', { name: '聊天' })).toBeVisible();
}

async function sendByText(page: Page, text: string): Promise<void> {
  const composer = page.getByLabel('消息输入');
  await composer.fill(text);
  await composer.press('Enter');
}

test.describe('chat desktop', () => {
  test('sends a user message and streams an assistant reply', async ({
    page,
  }) => {
    await gotoChat(page);
    await sendByText(page, 'hi');
    await expect(
      page.getByRole('log').getByText('hi', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('log').getByText('你好!')).toBeVisible();
  });

  test('session context carries prior messages', async ({ page }) => {
    await gotoChat(page);
    await sendByText(page, 'hi');
    await expect(page.getByRole('log').getByText('第1条')).toBeVisible();
    await sendByText(page, 'again');
    await expect(page.getByRole('log').getByText('第3条')).toBeVisible();
  });

  test('stub 401 shows a safe error and retains the user message', async ({
    page,
  }) => {
    await gotoChat(page, 'error-401');
    await sendByText(page, 'hi');
    await expect(
      page.getByRole('alert').getByText('Provider 拒绝了请求'),
    ).toBeVisible();
    await expect(
      page.getByRole('log').getByText('hi', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('unauthorized')).toHaveCount(0);
  });

  test('stub 500 shows a safe server-failed error without upstream body', async ({
    page,
  }) => {
    await gotoChat(page, 'error-500');
    await sendByText(page, 'hi');
    await expect(page.getByRole('alert').getByText('服务端出错')).toBeVisible();
    await expect(page.getByText('boom')).toHaveCount(0);
  });

  test('three-pane layout visible and composer within viewport', async ({
    page,
  }) => {
    await gotoChat(page);
    await expect(
      page.getByRole('navigation', { name: '主导航' }),
    ).toBeVisible();
    await expect(
      page.getByRole('complementary', { name: '对话列表' }),
    ).toBeVisible();
    const composer = page.getByLabel('消息输入');
    await expect(composer).toBeVisible();
    const box = await composer.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (box && viewport) {
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }
  });

  test('desktop Enter sends, Shift+Enter inserts a newline', async ({
    page,
  }) => {
    await gotoChat(page);
    const composer = page.getByLabel('消息输入');
    await composer.focus();
    await composer.press('Shift+Enter');
    await expect(composer).toHaveValue('\n');
    await expect(
      page.getByRole('log').getByText('开始和 AI 聊天吧。'),
    ).toBeVisible();
    await composer.fill('hello');
    await composer.press('Enter');
    await expect(
      page.getByRole('log').getByText('hello', { exact: true }),
    ).toBeVisible();
  });

  test('empty message cannot be sent', async ({ page }) => {
    await gotoChat(page);
    const composer = page.getByLabel('消息输入');
    await composer.focus();
    await composer.press('Enter');
    await expect(
      page.getByRole('log').getByText('开始和 AI 聊天吧。'),
    ).toBeVisible();
    await composer.fill('   ');
    await composer.press('Enter');
    await expect(
      page.getByRole('log').getByText('开始和 AI 聊天吧。'),
    ).toBeVisible();
  });

  test('composer auto-grows up to five rows', async ({ page }) => {
    await gotoChat(page);
    const composer = page.getByLabel('消息输入');
    await composer.fill('a\nb\nc\nd\ne\nf\ng');
    await expect(composer).toHaveAttribute('rows', '5');
    await composer.fill('a\nb');
    await expect(composer).toHaveAttribute('rows', '2');
  });

  test('api key never appears in DOM or console', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', (msg) => consoleMessages.push(msg.text()));
    await gotoChat(page);
    await sendByText(page, 'hi');
    await expect(page.getByRole('log').getByText('你好!')).toBeVisible();
    const dom = await page.content();
    expect(dom).not.toContain(API_KEY);
    expect(consoleMessages.some((m) => m.includes(API_KEY))).toBe(false);
  });
});

test.describe('chat auto-scroll', () => {
  test('follows the stream near bottom and stays put when scrolled up', async ({
    page,
  }) => {
    await gotoChat(page, 'stub-slow');
    await sendByText(page, 'hi');
    await expect(page.getByRole('log').getByText('你好!')).toBeVisible();
    const messages = page.getByRole('log');
    const nearBottomAfterStream = await messages.evaluate(
      (el) => el.scrollHeight - el.scrollTop - el.clientHeight < 80,
    );
    expect(nearBottomAfterStream).toBe(true);

    await messages.evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.waitForTimeout(120);
    const stayed = await messages.evaluate((el) => el.scrollTop < 80);
    expect(stayed).toBe(true);
  });
});

test.describe('chat mobile', () => {
  test.use({ viewport: { width: 412, height: 915 } });

  test('hides rail and conversation list', async ({ page }) => {
    await gotoChat(page);
    await expect(page.getByRole('navigation', { name: '主导航' })).toBeHidden();
    await expect(
      page.getByRole('complementary', { name: '对话列表' }),
    ).toBeHidden();
  });

  test('hamburger opens drawer, mask click closes', async ({ page }) => {
    await gotoChat(page);
    await page.getByRole('button', { name: '打开对话列表' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.mouse.click(380, 50);
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('Escape closes the drawer and returns focus to the hamburger', async ({
    page,
  }) => {
    await gotoChat(page);
    const hamburger = page.getByRole('button', { name: '打开对话列表' });
    await hamburger.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(hamburger).toBeFocused();
  });

  test('send button works and composer is visible', async ({ page }) => {
    await gotoChat(page);
    const composer = page.getByLabel('消息输入');
    await expect(composer).toBeVisible();
    await composer.fill('hi');
    await page.getByRole('button', { name: '发送' }).click();
    await expect(
      page.getByRole('log').getByText('hi', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('log').getByText('你好!')).toBeVisible();
  });

  test('Enter inserts a newline and does not send on mobile', async ({
    page,
  }) => {
    await gotoChat(page);
    const composer = page.getByLabel('消息输入');
    await composer.fill('a');
    await composer.press('Enter');
    await expect(composer).toHaveValue('a\n');
    await expect(
      page.getByRole('log').getByText('a', { exact: true }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: '发送' }).click();
    await expect(
      page.getByRole('log').getByText('a', { exact: true }),
    ).toBeVisible();
  });
});
