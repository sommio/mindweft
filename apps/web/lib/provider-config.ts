export type ProviderConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type ProviderConfigErrorCode =
  | 'invalid_base_url'
  | 'base_url_unsupported_scheme'
  | 'base_url_has_credentials'
  | 'base_url_has_fragment'
  | 'missing_api_key'
  | 'missing_model';

export type ProviderConfigError = { code: ProviderConfigErrorCode };

export type ProviderConfigValidation =
  | { ok: true; config: ProviderConfig }
  | { ok: false; errors: ProviderConfigError[] };

/**
 * 校验 OpenAI-compatible Provider 配置。
 *
 * 安全规则：Base URL 仅接受 http(s)，拒绝内嵌用户名密码与 fragment，
 * 允许 localhost / 私网 IP（本地自建是项目核心能力）。
 */
export function validateProviderConfig(
  input: ProviderConfig,
): ProviderConfigValidation {
  const baseUrl = input.baseUrl.trim();
  const apiKey = input.apiKey.trim();
  const model = input.model.trim();

  const errors: ProviderConfigError[] = [];

  let parsed: URL | undefined;
  try {
    parsed = new URL(baseUrl);
  } catch {
    errors.push({ code: 'invalid_base_url' });
  }

  if (parsed) {
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      errors.push({ code: 'base_url_unsupported_scheme' });
    }
    if (parsed.username !== '' || parsed.password !== '') {
      errors.push({ code: 'base_url_has_credentials' });
    }
    if (parsed.hash !== '') {
      errors.push({ code: 'base_url_has_fragment' });
    }
  }

  if (apiKey === '') {
    errors.push({ code: 'missing_api_key' });
  }
  if (model === '') {
    errors.push({ code: 'missing_model' });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, config: { baseUrl, apiKey, model } };
}
