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
): Promise<{ status: number; body: string }> {
  const res = await request.post('/api/chat', {
    data: {
      provider: { baseUrl: STUB_BASE, apiKey: API_KEY, model },
      content,
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
