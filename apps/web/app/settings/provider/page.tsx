'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';

import {
  validateProviderConfig,
  type ProviderConfigErrorCode,
} from '../../../lib/provider-config';
import { useProviderConfig } from '../../../lib/use-provider-config';

const ERROR_MESSAGES: Record<ProviderConfigErrorCode, string> = {
  invalid_base_url: 'Base URL 格式无效',
  base_url_unsupported_scheme: 'Base URL 仅支持 http 或 https',
  base_url_has_credentials: 'Base URL 不能内嵌用户名密码',
  base_url_has_fragment: 'Base URL 不能包含 fragment',
  missing_api_key: '请填写 API Key',
  missing_model: '请填写 Model',
};

const ERROR_FIELD: Record<ProviderConfigErrorCode, keyof FieldErrors> = {
  invalid_base_url: 'baseUrl',
  base_url_unsupported_scheme: 'baseUrl',
  base_url_has_credentials: 'baseUrl',
  base_url_has_fragment: 'baseUrl',
  missing_api_key: 'apiKey',
  missing_model: 'model',
};

type FieldErrors = {
  baseUrl: ProviderConfigErrorCode[];
  apiKey: ProviderConfigErrorCode[];
  model: ProviderConfigErrorCode[];
};

function emptyErrors(): FieldErrors {
  return { baseUrl: [], apiKey: [], model: [] };
}

export default function ProviderSettingsPage() {
  const { config, ready, save, clear } = useProviderConfig();
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>(emptyErrors());
  const [saved, setSaved] = useState(false);
  const prefilled = useRef(false);

  useEffect(() => {
    if (!ready || prefilled.current) return;
    prefilled.current = true;
    if (config) {
      setBaseUrl(config.baseUrl);
      setApiKey(config.apiKey);
      setModel(config.model);
    }
  }, [ready, config]);

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateProviderConfig({ baseUrl, apiKey, model });
    if (!result.ok) {
      const next = emptyErrors();
      for (const error of result.errors) {
        next[ERROR_FIELD[error.code]].push(error.code);
      }
      setErrors(next);
      setSaved(false);
      return;
    }
    save(result.config);
    setBaseUrl(result.config.baseUrl);
    setApiKey(result.config.apiKey);
    setModel(result.config.model);
    setErrors(emptyErrors());
    setSaved(true);
  }

  function handleClear() {
    clear();
    setBaseUrl('');
    setApiKey('');
    setModel('');
    setErrors(emptyErrors());
    setSaved(false);
  }

  return (
    <main>
      <header>
        <h1>Provider 设置</h1>
        <Link href="/chat">返回聊天</Link>
      </header>

      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="provider-base-url">Base URL</label>
          <input
            id="provider-base-url"
            name="baseUrl"
            type="url"
            value={baseUrl}
            onChange={(event) => {
              setBaseUrl(event.target.value);
              setSaved(false);
            }}
            aria-invalid={errors.baseUrl.length > 0}
            placeholder="https://api.openai.com"
            autoComplete="off"
          />
          {errors.baseUrl.map((code) => (
            <p key={code} role="alert">
              {ERROR_MESSAGES[code]}
            </p>
          ))}
        </div>

        <div>
          <label htmlFor="provider-api-key">API Key</label>
          <div>
            <input
              id="provider-api-key"
              name="apiKey"
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(event) => {
                setApiKey(event.target.value);
                setSaved(false);
              }}
              aria-invalid={errors.apiKey.length > 0}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => {
                setShowApiKey((value) => !value);
              }}
              aria-pressed={showApiKey}
            >
              {showApiKey ? '隐藏' : '显示'}
            </button>
          </div>
          {errors.apiKey.map((code) => (
            <p key={code} role="alert">
              {ERROR_MESSAGES[code]}
            </p>
          ))}
        </div>

        <div>
          <label htmlFor="provider-model">Model</label>
          <input
            id="provider-model"
            name="model"
            type="text"
            value={model}
            onChange={(event) => {
              setModel(event.target.value);
              setSaved(false);
            }}
            aria-invalid={errors.model.length > 0}
            placeholder="gpt-4o"
            autoComplete="off"
          />
          {errors.model.map((code) => (
            <p key={code} role="alert">
              {ERROR_MESSAGES[code]}
            </p>
          ))}
        </div>

        <div>
          <button type="submit">保存</button>
          <button type="button" onClick={handleClear}>
            清除本地配置
          </button>
        </div>

        {saved ? (
          <p role="status">
            已保存。配置仅保存在本浏览器。<Link href="/chat">返回聊天</Link>。
          </p>
        ) : null}
      </form>
    </main>
  );
}
