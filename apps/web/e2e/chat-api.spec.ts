import { expect, test, type APIRequestContext } from '@playwright/test';

const STUB_BASE = 'http://127.0.0.1:8787/v1';
const API_KEY = 'sk-stub-secret-do-not-leak';

type StoredMessage = {
  id: string;
  role: string;
  content: string;
  createdAt: number;
};

type ChatErrorBody = { code: string };

async function resetDb(request: APIRequestContext): Promise<void> {
  const res = await request.post('/api/test/reset-db');
  expect(res.ok()).toBe(true);
}

async function postChat(
  request: APIRequestContext,
  model: string,
  content = 'hi',
  conversationId?: string,
): Promise<{ status: number; body: string }> {
  const res = await request.post('/api/chat', {
    data: {
      provider: { baseUrl: STUB_BASE, apiKey: API_KEY, model },
      content,
      ...(conversationId === undefined ? {} : { conversationId }),
    },
    timeout: 15_000,
  });
  return { status: res.status(), body: await res.text() };
}

async function getMessages(
  request: APIRequestContext,
): Promise<StoredMessage[]> {
  const res = await request.get('/api/conversations/default/messages');
  expect(res.ok()).toBe(true);
  const data = (await res.json()) as { messages?: StoredMessage[] };
  return data.messages ?? [];
}

async function getMessagesFor(
  request: APIRequestContext,
  conversationId: string,
): Promise<StoredMessage[]> {
  const res = await request.get(
    `/api/conversations/${conversationId}/messages`,
  );
  expect(res.ok()).toBe(true);
  const data = (await res.json()) as { messages?: StoredMessage[] };
  return data.messages ?? [];
}

async function createConversation(
  request: APIRequestContext,
): Promise<{ id: string; displayName: string }> {
  const res = await request.post('/api/conversations');
  expect(res.ok()).toBe(true);
  const data = (await res.json()) as {
    conversation: { id: string; displayName: string };
  };
  return data.conversation;
}

async function listConversations(
  request: APIRequestContext,
): Promise<{ id: string; displayName: string; updatedAt: number }[]> {
  const res = await request.get('/api/conversations');
  expect(res.ok()).toBe(true);
  const data = (await res.json()) as {
    conversations?: { id: string; displayName: string; updatedAt: number }[];
  };
  return data.conversations ?? [];
}

function nth(messages: StoredMessage[], index: number): StoredMessage {
  const message = messages[index];
  if (message === undefined) {
    throw new Error(
      `expected message at index ${String(index)}, got ${String(messages.length)}`,
    );
  }
  return message;
}

test.beforeEach(async ({ request }) => {
  await resetDb(request);
});

test.describe('chat api contract', () => {
  test('GET messages returns only domain fields, no provider or apiKey', async ({
    request,
  }) => {
    await postChat(request, 'stub-model', 'hello');
    const messages = await getMessages(request);
    expect(messages.length).toBe(2);
    const serialized = JSON.stringify(messages);
    expect(serialized).not.toContain('apiKey');
    expect(serialized).not.toContain('provider');
    expect(serialized).not.toContain(API_KEY);
    for (const m of messages) {
      expect(['user', 'assistant']).toContain(m.role);
      expect(typeof m.id).toBe('string');
      expect(typeof m.content).toBe('string');
      expect(typeof m.createdAt).toBe('number');
    }
  });

  test('invalid base url yields provider_invalid', async ({ request }) => {
    const res = await request.post('/api/chat', {
      data: {
        provider: { baseUrl: 'not-a-url', apiKey: API_KEY, model: 'm' },
        content: 'hi',
      },
    });
    expect(res.status()).toBe(400);
    const data = (await res.json()) as ChatErrorBody;
    expect(data.code).toBe('provider_invalid');
    expect(JSON.stringify(data)).not.toContain(API_KEY);
  });

  test('missing model yields provider_invalid', async ({ request }) => {
    const res = await request.post('/api/chat', {
      data: {
        provider: { baseUrl: STUB_BASE, apiKey: API_KEY, model: '' },
        content: 'hi',
      },
    });
    expect(res.status()).toBe(400);
    expect(((await res.json()) as ChatErrorBody).code).toBe('provider_invalid');
  });

  test('missing api key yields provider_invalid', async ({ request }) => {
    const res = await request.post('/api/chat', {
      data: {
        provider: { baseUrl: STUB_BASE, apiKey: '', model: 'm' },
        content: 'hi',
      },
    });
    expect(res.status()).toBe(400);
    expect(((await res.json()) as ChatErrorBody).code).toBe('provider_invalid');
  });

  test('empty content yields message_invalid', async ({ request }) => {
    const res = await request.post('/api/chat', {
      data: {
        provider: { baseUrl: STUB_BASE, apiKey: API_KEY, model: 'stub-model' },
        content: '   ',
      },
    });
    expect(res.status()).toBe(400);
    expect(((await res.json()) as ChatErrorBody).code).toBe('message_invalid');
  });

  test('successful stream persists user and assistant messages', async ({
    request,
  }) => {
    const { status, body } = await postChat(request, 'stub-model', '你好');
    expect(status).toBe(200);
    expect(body).toContain('[DONE]');
    const messages = await getMessages(request);
    expect(messages.length).toBe(2);
    expect(nth(messages, 0).role).toBe('user');
    expect(nth(messages, 0).content).toBe('你好');
    expect(nth(messages, 1).role).toBe('assistant');
    expect(nth(messages, 1).content).toContain('你好!');
  });

  test('provider 401 error persists only the user message', async ({
    request,
  }) => {
    const { status, body } = await postChat(request, 'error-401', 'keep-me');
    expect(status).toBe(200);
    expect(body).not.toContain('[DONE]');
    const messages = await getMessages(request);
    expect(messages.length).toBe(1);
    expect(nth(messages, 0).role).toBe('user');
    expect(nth(messages, 0).content).toBe('keep-me');
    expect(JSON.stringify(messages)).not.toContain('unauthorized');
  });

  test('network failure persists only the user message', async ({
    request,
  }) => {
    const { status } = await postChat(request, 'error-network', 'keep-me');
    // 网络错误：流响应可能非 200 或被中断。
    expect([200, 502]).toContain(status);
    const messages = await getMessages(request);
    expect(messages.length).toBe(1);
    expect(nth(messages, 0).role).toBe('user');
  });
});

test.describe('multi-conversation isolation', () => {
  test('messages and provider context are isolated per conversation', async ({
    request,
  }) => {
    const a = await createConversation(request);
    const b = await createConversation(request);

    // A 收发一条：Provider 历史长度 = 1（只有 A 的首条用户消息）。
    const first = await postChat(request, 'stub-model', 'messageA', a.id);
    expect(first.status).toBe(200);
    expect(first.body).toContain('[DONE]');

    // B 收发一条：历史长度仍为 1，证明 B 看不到 A 的消息。
    const second = await postChat(request, 'stub-model', 'messageB', b.id);
    expect(second.status).toBe(200);
    expect(second.body).toContain('[DONE]');

    // A 再发一条：历史长度 = 3（A 已有 user+assistant+新 user），证明 B 未污染 A。
    const third = await postChat(request, 'stub-model', 'messageA2', a.id);
    expect(third.body).toContain('[DONE]');

    const aMsgs = await getMessagesFor(request, a.id);
    const bMsgs = await getMessagesFor(request, b.id);
    // A 的 assistant 回复分别对应历史长度 1 与 3。
    const aAssistants = aMsgs
      .filter((m) => m.role === 'assistant')
      .map((m) => m.content);
    expect(aAssistants.length).toBe(2);
    expect(aAssistants[0] ?? '').toContain('第1条');
    expect(aAssistants[1] ?? '').toContain('第3条');
    // B 的 assistant 回复对应历史长度 1，证明 B 上下文只有自身首条。
    const bAssistants = bMsgs
      .filter((m) => m.role === 'assistant')
      .map((m) => m.content);
    expect(bAssistants.length).toBe(1);
    expect(bAssistants[0] ?? '').toContain('第1条');
    // 隔离：A 不含 B 的消息，反之亦然。
    expect(aMsgs.some((m) => m.content === 'messageB')).toBe(false);
    expect(bMsgs.some((m) => m.content === 'messageA')).toBe(false);
  });

  test('unknown conversation id returns 404 and persists no orphan message', async ({
    request,
  }) => {
    const before = await getMessages(request);
    const res = await request.post('/api/chat', {
      data: {
        provider: { baseUrl: STUB_BASE, apiKey: API_KEY, model: 'stub-model' },
        content: 'orphan',
        conversationId: 'no-such-conversation',
      },
      timeout: 15_000,
    });
    expect(res.status()).toBe(404);
    expect(((await res.json()) as ChatErrorBody).code).toBe(
      'conversation_not_found',
    );
    // 默认对话消息数不变，未创建孤儿消息。
    const after = await getMessages(request);
    expect(after.length).toBe(before.length);
    expect(after.some((m) => m.content === 'orphan')).toBe(false);
  });
});

test.describe('conversation naming and ordering', () => {
  test('new conversation defaults to “新对话”', async ({ request }) => {
    const conv = await createConversation(request);
    expect(conv.displayName).toBe('新对话');
  });

  test('first user message derives a local name without calling the provider', async ({
    request,
  }) => {
    const conv = await createConversation(request);
    await postChat(request, 'stub-model', '今天读了一本很好的书', conv.id);
    const list = await listConversations(request);
    const updated = list.find((c) => c.id === conv.id);
    expect(updated?.displayName).toBe('今天读了一本很好的书');
  });

  test('long first message is truncated with an ellipsis', async ({
    request,
  }) => {
    const conv = await createConversation(request);
    const long = '一'.repeat(30);
    await postChat(request, 'stub-model', long, conv.id);
    const list = await listConversations(request);
    const updated = list.find((c) => c.id === conv.id);
    expect(updated?.displayName.length).toBe(21);
    expect(updated?.displayName.endsWith('…')).toBe(true);
  });

  test('default conversation keeps its name after a message', async ({
    request,
  }) => {
    await postChat(request, 'stub-model', '你好');
    const list = await listConversations(request);
    const defaultConv = list.find((c) => c.id === 'default');
    expect(defaultConv?.displayName).toBe('默认对话');
  });

  test('rename trims and persists the new name', async ({ request }) => {
    const conv = await createConversation(request);
    const res = await request.patch(`/api/conversations/${conv.id}`, {
      data: { displayName: '  读书笔记  ' },
    });
    expect(res.ok()).toBe(true);
    const data = (await res.json()) as {
      conversation: { id: string; displayName: string };
    };
    expect(data.conversation.displayName).toBe('读书笔记');
  });

  test('rename rejects empty name with 400', async ({ request }) => {
    const conv = await createConversation(request);
    const res = await request.patch(`/api/conversations/${conv.id}`, {
      data: { displayName: '   ' },
    });
    expect(res.status()).toBe(400);
    expect(((await res.json()) as ChatErrorBody).code).toBe('invalid_name');
  });

  test('rename rejects overlong name with 400', async ({ request }) => {
    const conv = await createConversation(request);
    const res = await request.patch(`/api/conversations/${conv.id}`, {
      data: { displayName: 'x'.repeat(101) },
    });
    expect(res.status()).toBe(400);
    expect(((await res.json()) as ChatErrorBody).code).toBe('invalid_name');
  });

  test('rename unknown conversation returns 404', async ({ request }) => {
    const res = await request.patch('/api/conversations/no-such', {
      data: { displayName: 'ok' },
    });
    expect(res.status()).toBe(404);
    expect(((await res.json()) as ChatErrorBody).code).toBe(
      'conversation_not_found',
    );
  });

  test('list is ordered by recent activity descending', async ({ request }) => {
    const a = await createConversation(request);
    const b = await createConversation(request);
    // 对 a 发消息使其 updatedAt 更新到最近。
    await postChat(request, 'stub-model', 'hi', a.id);
    const list = await listConversations(request);
    const aIdx = list.findIndex((c) => c.id === a.id);
    const bIdx = list.findIndex((c) => c.id === b.id);
    expect(aIdx).toBeLessThan(bIdx);
  });
});
