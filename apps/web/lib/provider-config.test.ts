import { describe, expect, it } from 'vitest';

import { validateProviderConfig, type ProviderConfig } from './provider-config';

describe('validateProviderConfig', () => {
  const valid: ProviderConfig = {
    baseUrl: 'https://api.openai.com',
    apiKey: 'sk-test',
    model: 'gpt-4o',
  };

  it('accepts https url without credentials or fragment', () => {
    const result = validateProviderConfig(valid);
    expect(result).toEqual({ ok: true, config: valid });
  });

  it('accepts http url', () => {
    const result = validateProviderConfig({
      ...valid,
      baseUrl: 'http://api.openai.com',
    });
    expect(result.ok).toBe(true);
  });

  it('accepts localhost base url', () => {
    const result = validateProviderConfig({
      ...valid,
      baseUrl: 'http://localhost:1234',
    });
    expect(result.ok).toBe(true);
  });

  it('accepts private network base url', () => {
    const result = validateProviderConfig({
      ...valid,
      baseUrl: 'https://192.168.1.10',
    });
    expect(result.ok).toBe(true);
  });

  it('accepts base url with port and path', () => {
    const result = validateProviderConfig({
      ...valid,
      baseUrl: 'https://host.local:8080/v1',
    });
    expect(result.ok).toBe(true);
  });

  it('trims whitespace before validating', () => {
    const result = validateProviderConfig({
      baseUrl: '  https://api.openai.com  ',
      apiKey: '  sk-test  ',
      model: '  gpt-4o  ',
    });
    expect(result).toEqual({
      ok: true,
      config: {
        baseUrl: 'https://api.openai.com',
        apiKey: 'sk-test',
        model: 'gpt-4o',
      },
    });
  });

  it('rejects non-url base url', () => {
    const result = validateProviderConfig({
      ...valid,
      baseUrl: 'not a url',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ code: 'invalid_base_url' });
    }
  });

  it('rejects ftp scheme', () => {
    const result = validateProviderConfig({
      ...valid,
      baseUrl: 'ftp://api.openai.com',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: 'base_url_unsupported_scheme',
      });
    }
  });

  it('rejects javascript scheme', () => {
    const result = validateProviderConfig({
      ...valid,
      baseUrl: 'javascript:alert(1)',
    });
    expect(result.ok).toBe(false);
  });

  it('rejects embedded username and password', () => {
    const result = validateProviderConfig({
      ...valid,
      baseUrl: 'https://user:pass@api.openai.com',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: 'base_url_has_credentials',
      });
    }
  });

  it('rejects embedded username only', () => {
    const result = validateProviderConfig({
      ...valid,
      baseUrl: 'https://user@api.openai.com',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: 'base_url_has_credentials',
      });
    }
  });

  it('rejects fragment', () => {
    const result = validateProviderConfig({
      ...valid,
      baseUrl: 'https://api.openai.com#section',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: 'base_url_has_fragment',
      });
    }
  });

  it('rejects empty api key', () => {
    const result = validateProviderConfig({ ...valid, apiKey: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ code: 'missing_api_key' });
    }
  });

  it('rejects whitespace-only api key', () => {
    const result = validateProviderConfig({ ...valid, apiKey: '   ' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ code: 'missing_api_key' });
    }
  });

  it('rejects empty model', () => {
    const result = validateProviderConfig({ ...valid, model: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ code: 'missing_model' });
    }
  });

  it('rejects whitespace-only model', () => {
    const result = validateProviderConfig({ ...valid, model: '  ' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ code: 'missing_model' });
    }
  });

  it('collects multiple errors', () => {
    const result = validateProviderConfig({
      baseUrl: 'ftp://u:p@h#x',
      apiKey: '',
      model: '',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const codes = result.errors.map((error) => error.code);
      expect(codes).toContain('base_url_unsupported_scheme');
      expect(codes).toContain('base_url_has_credentials');
      expect(codes).toContain('base_url_has_fragment');
      expect(codes).toContain('missing_api_key');
      expect(codes).toContain('missing_model');
    }
  });
});
