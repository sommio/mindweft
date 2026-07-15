import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test';

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

async function resetDb(request: APIRequestContext): Promise<void> {
  const res = await request.post('/api/test/reset-db');
  expect(res.ok()).toBe(true);
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

async function sendByButton(page: Page, text: string): Promise<void> {
  const composer = page.getByLabel('消息输入');
  await composer.fill(text);
  await page.getByRole('button', { name: '发送' }).click();
}

async function waitForStreamDone(page: Page): Promise<void> {
  // 流式期间输入区 disabled；恢复可用表示流结束并已同步。
  const composer = page.getByLabel('消息输入');
  await expect(composer).toBeEnabled();
}

test.beforeEach(async ({ request }) => {
  await resetDb(request);
});

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

  test('session context carries prior messages from the database', async ({
    page,
  }) => {
    await gotoChat(page);
    await sendByText(page, 'hi');
    await expect(page.getByRole('log').getByText('第1条')).toBeVisible();
    await waitForStreamDone(page);
    await sendByText(page, 'again');
    await expect(page.getByRole('log').getByText('第3条')).toBeVisible();
  });

  test('reload restores user and assistant messages in order', async ({
    page,
  }) => {
    await gotoChat(page);
    await sendByText(page, '你好');
    await waitForStreamDone(page);
    await page.reload();
    await expect(page.getByRole('heading', { name: '聊天' })).toBeVisible();
    const log = page.getByRole('log');
    await expect(log.getByText('你好', { exact: true })).toBeVisible();
    await expect(log.getByText('你好!')).toBeVisible();
    // 顺序稳定：user 在 assistant 之前。
    const userIdx = await log
      .getByText('你好', { exact: true })
      .evaluate((el) => el.getBoundingClientRect().top);
    const assistantIdx = await log
      .getByText('你好!')
      .evaluate((el) => el.getBoundingClientRect().top);
    expect(userIdx).toBeLessThan(assistantIdx);
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

  test('provider failure retains the user message after reload', async ({
    page,
  }) => {
    await gotoChat(page, 'error-401');
    await sendByText(page, 'persist-me');
    await expect(
      page.getByRole('alert').getByText('Provider 拒绝了请求'),
    ).toBeVisible();
    await page.reload();
    // 用户消息已持久化；assistant 部分内容不持久化。
    await expect(
      page.getByRole('log').getByText('persist-me', { exact: true }),
    ).toBeVisible();
  });

  test('stop button aborts the stream and marks the assistant message incomplete', async ({
    page,
  }) => {
    await gotoChat(page, 'stub-slow');
    await sendByText(page, 'hi');
    // 等待流式开始出现 AI 文本。
    await expect(page.getByRole('log').getByText('mw')).toBeVisible();
    await page.getByRole('button', { name: '停止' }).click();
    // 部分内容保留并标记未完成。
    await expect(page.getByText('未完成')).toBeVisible();
    // Composer 恢复可用（发送按钮回来）。
    await expect(page.getByRole('button', { name: '发送' })).toBeVisible();
    await expect(page.getByLabel('消息输入')).toBeEnabled();
  });

  test('stopped partial assistant content disappears after reload', async ({
    page,
  }) => {
    await gotoChat(page, 'stub-slow');
    await sendByText(page, 'hi');
    await expect(page.getByRole('log').getByText('mw')).toBeVisible();
    await page.getByRole('button', { name: '停止' }).click();
    await expect(page.getByText('未完成')).toBeVisible();
    await page.reload();
    // 用户消息保留；被停止的部分 assistant 内容不持久化、刷新后消失。
    await expect(
      page.getByRole('log').getByText('hi', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('未完成')).toHaveCount(0);
    await expect(page.getByText('你好!')).toHaveCount(0);
  });

  test('composer recovers after an error and can send again', async ({
    page,
  }) => {
    await gotoChat(page, 'error-401');
    await sendByText(page, 'first');
    await expect(
      page.getByRole('alert').getByText('Provider 拒绝了请求'),
    ).toBeVisible();
    // Composer 恢复可用后再次发送。
    await expect(page.getByLabel('消息输入')).toBeEnabled();
    await sendByText(page, 'second');
    await expect(
      page.getByRole('log').getByText('second', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('alert').getByText('Provider 拒绝了请求'),
    ).toBeVisible();
  });

  test('network failure shows a safe error and retains the user message', async ({
    page,
  }) => {
    await gotoChat(page, 'error-network');
    await sendByText(page, 'hi');
    await expect(
      page.getByRole('alert').getByText('无法连接 Provider'),
    ).toBeVisible();
    await expect(
      page.getByRole('log').getByText('hi', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('ECONNREFUSED')).toHaveCount(0);
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

  test('keyboard tab order reaches rail, composer and send button', async ({
    page,
  }) => {
    await gotoChat(page);
    // 第一个可聚焦控件是 Rail 聊天链接。
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: '聊天' })).toBeFocused();
    // 顺序 Tab 直到消息输入区获得焦点。
    const composer = page.getByLabel('消息输入');
    for (let i = 0; i < 8; i += 1) {
      if (await composer.evaluate((el) => el === document.activeElement)) break;
      await page.keyboard.press('Tab');
    }
    await expect(composer).toBeFocused();
    await composer.fill('x');
    await expect(page.getByRole('button', { name: '发送' })).toBeEnabled();
  });
});

test.describe('chat multi-conversation desktop', () => {
  test('isolates messages across conversations', async ({ page }) => {
    await gotoChat(page);
    // 创建对话 A 并发送首条消息，触发本地自动命名。
    await page.getByRole('button', { name: '新建对话' }).click();
    await expect(
      page.getByRole('button', { name: '新对话', exact: true }),
    ).toBeVisible();
    await sendByText(page, '消息A');
    await expect(page.getByRole('log').getByText('消息A')).toBeVisible();
    // 等待侧栏刷新出 A 的自动名称。
    await expect(
      page.getByRole('button', { name: '消息A', exact: true }),
    ).toBeVisible();

    // 创建对话 B 并发送首条消息。
    await page.getByRole('button', { name: '新建对话' }).click();
    await expect(
      page.getByRole('button', { name: '新对话', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('log').getByText('开始和 AI 聊天吧。'),
    ).toBeVisible();
    await sendByText(page, '消息B');
    await expect(page.getByRole('log').getByText('消息B')).toBeVisible();

    // 切回 A：只看到 A 的消息，B 的消息不污染。
    await page.getByRole('button', { name: '消息A', exact: true }).click();
    await expect(page.getByRole('log').getByText('消息A')).toBeVisible();
    await expect(page.getByRole('log').getByText('消息B')).toHaveCount(0);

    // 切到 B：只看到 B 的消息。
    await page.getByRole('button', { name: '消息B', exact: true }).click();
    await expect(page.getByRole('log').getByText('消息B')).toBeVisible();
    await expect(page.getByRole('log').getByText('消息A')).toHaveCount(0);
  });

  test('renames a conversation inline', async ({ page }) => {
    await gotoChat(page);
    await page.getByRole('button', { name: '新建对话' }).click();
    await expect(
      page.getByRole('button', { name: '新对话', exact: true }),
    ).toBeVisible();
    await sendByText(page, '原主题');
    await expect(
      page.getByRole('button', { name: '原主题', exact: true }),
    ).toBeVisible();
    // 点击重命名按钮进入内联编辑。
    await page.getByRole('button', { name: '重命名 原主题' }).click();
    const input = page.getByLabel('重命名对话');
    await input.fill('读书笔记');
    await input.press('Enter');
    await expect(
      page.getByRole('button', { name: '读书笔记', exact: true }),
    ).toBeVisible();
    // 刷新后名称保持。
    await page.reload();
    await expect(
      page.getByRole('button', { name: '读书笔记', exact: true }),
    ).toBeVisible();
  });

  test('drafts are isolated per conversation and restored after reload', async ({
    page,
  }) => {
    await gotoChat(page);
    const composer = page.getByLabel('消息输入');
    // 在默认对话输入草稿但不发送。
    await composer.fill('默认草稿');
    await expect(composer).toHaveValue('默认草稿');
    // 新建对话：切到新对话后草稿应为空。
    await page.getByRole('button', { name: '新建对话' }).click();
    await expect(
      page.getByRole('button', { name: '新对话', exact: true }),
    ).toBeVisible();
    await expect(composer).toHaveValue('');
    await composer.fill('新对话草稿');
    // 刷新：当前对话通过 URL 恢复，草稿从 localStorage 恢复。
    await page.reload();
    await expect(page.getByRole('heading', { name: '聊天' })).toBeVisible();
    await expect(composer).toHaveValue('新对话草稿');
    // 切回默认对话：草稿恢复，且未写入消息表（空状态仍在）。
    await page.getByRole('button', { name: '默认对话', exact: true }).click();
    await expect(composer).toHaveValue('默认草稿');
    await expect(
      page.getByRole('log').getByText('开始和 AI 聊天吧。'),
    ).toBeVisible();
  });
});

test.describe('chat mobile iphone-se', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('menu button visible and drawer has close button', async ({ page }) => {
    await gotoChat(page);
    const hamburger = page.getByRole('button', { name: '打开对话列表' });
    await expect(hamburger).toBeVisible();
    await hamburger.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(
      page.getByRole('complementary', { name: '对话列表' }),
    ).toBeVisible();
    // 明确关闭按钮。
    await page.getByRole('button', { name: '关闭对话列表' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('create in drawer closes drawer and loads target', async ({ page }) => {
    await gotoChat(page);
    await page.getByRole('button', { name: '打开对话列表' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: '新建对话' }).click();
    // 创建后抽屉自动关闭并进入新对话（空状态）。
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(
      page.getByRole('log').getByText('开始和 AI 聊天吧。'),
    ).toBeVisible();
  });

  test('select in drawer closes drawer and loads target conversation', async ({
    page,
  }) => {
    await gotoChat(page);
    // 先在默认对话发一条消息，使默认对话有内容。手机端 Enter 不发送，用发送按钮。
    await sendByButton(page, '桌面话题');
    await expect(page.getByRole('log').getByText('桌面话题')).toBeVisible();
    await waitForStreamDone(page);
    // 打开抽屉，新建一个空对话。
    await page.getByRole('button', { name: '打开对话列表' }).click();
    await page.getByRole('button', { name: '新建对话' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(
      page.getByRole('log').getByText('开始和 AI 聊天吧。'),
    ).toBeVisible();
    // 再次打开抽屉，选择默认对话：抽屉关闭并加载默认对话历史。
    await page.getByRole('button', { name: '打开对话列表' }).click();
    await page.getByRole('button', { name: '默认对话', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('log').getByText('桌面话题')).toBeVisible();
  });

  test('mask click closes drawer', async ({ page }) => {
    await gotoChat(page);
    await page.getByRole('button', { name: '打开对话列表' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    // 抽屉左对齐 280px，右侧为遮罩。
    await page.mouse.click(360, 50);
    await expect(page.getByRole('dialog')).toBeHidden();
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
