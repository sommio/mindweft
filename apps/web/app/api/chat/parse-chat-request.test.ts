import { describe, expect, it } from 'vitest';

import { parseChatRequest } from './parse-chat-request';

const validProvider = {
  baseUrl: 'https://api.openai.com',
  apiKey: 'sk-test-secret',
  model: 'gpt-4o',
};

describe('parseChatRequest', () => {
  it('accepts a valid body with one user message', () => {
    const result = parseChatRequest({
      provider: validProvider,
      messages: [{ role: 'user', content: '你好' }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider).toEqual(validProvider);
      expect(result.messages).toEqual([{ role: 'user', content: '你好' }]);
    }
  });

  it('accepts user and assistant messages', () => {
    const result = parseChatRequest({
      provider: validProvider,
      messages: [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' },
        { role: 'user', content: 'again' },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it('rejects non-object body with invalid_body_shape', () => {
    expect(parseChatRequest(null)).toEqual({
      ok: false,
      code: 'invalid_body_shape',
    });
    expect(parseChatRequest('nope')).toEqual({
      ok: false,
      code: 'invalid_body_shape',
    });
    expect(parseChatRequest(42)).toEqual({
      ok: false,
      code: 'invalid_body_shape',
    });
  });

  it('rejects missing provider with provider_invalid', () => {
    const result = parseChatRequest({
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(result).toEqual({ ok: false, code: 'provider_invalid' });
  });

  it('rejects invalid provider config with provider_invalid and safe error codes', () => {
    const result = parseChatRequest({
      provider: { baseUrl: 'not-a-url', apiKey: '', model: '' },
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('provider_invalid');
      expect(result.providerErrors).toEqual([
        { code: 'invalid_base_url' },
        { code: 'missing_api_key' },
        { code: 'missing_model' },
      ]);
    }
  });

  it('rejects missing messages with messages_missing', () => {
    const result = parseChatRequest({ provider: validProvider });
    expect(result).toEqual({ ok: false, code: 'messages_missing' });
  });

  it('rejects non-array messages with messages_missing', () => {
    const result = parseChatRequest({
      provider: validProvider,
      messages: 'nope',
    });
    expect(result).toEqual({ ok: false, code: 'messages_missing' });
  });

  it('rejects empty messages array with messages_empty', () => {
    const result = parseChatRequest({ provider: validProvider, messages: [] });
    expect(result).toEqual({ ok: false, code: 'messages_empty' });
  });

  it('rejects message with empty/whitespace content with message_invalid', () => {
    const result = parseChatRequest({
      provider: validProvider,
      messages: [{ role: 'user', content: '   ' }],
    });
    expect(result).toEqual({ ok: false, code: 'message_invalid' });
  });

  it('rejects message with unknown role with message_invalid', () => {
    const result = parseChatRequest({
      provider: validProvider,
      messages: [{ role: 'tool', content: 'hi' }],
    });
    expect(result).toEqual({ ok: false, code: 'message_invalid' });
  });

  it('rejects system role (first version only has user and assistant)', () => {
    const result = parseChatRequest({
      provider: validProvider,
      messages: [{ role: 'system', content: 'hi' }],
    });
    expect(result).toEqual({ ok: false, code: 'message_invalid' });
  });

  it('rejects message that is not an object with message_invalid', () => {
    const result = parseChatRequest({
      provider: validProvider,
      messages: ['nope'],
    });
    expect(result).toEqual({ ok: false, code: 'message_invalid' });
  });

  it('does not surface apiKey in any error result', () => {
    const failing = parseChatRequest({
      provider: { baseUrl: 'x', apiKey: 'sk-leak-secret', model: 'm' },
      messages: [{ role: 'user', content: 'hi' }],
    });
    if (failing.ok) {
      throw new Error('expected failure');
    }
    expect(JSON.stringify(failing)).not.toContain('sk-leak-secret');
  });
});
