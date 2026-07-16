'use client';

import { useCallback, useEffect, useState } from 'react';

import type { ProviderConfig } from './provider-config';

export const PROVIDER_CONFIG_STORAGE_KEY = 'mindweft.provider-config';
export const EMBEDDING_CONFIG_STORAGE_KEY =
  'mindweft.embedding-provider-config';

export type UseProviderConfig = {
  config: ProviderConfig | null;
  ready: boolean;
  save: (config: ProviderConfig) => void;
  clear: () => void;
  embeddingConfig: ProviderConfig | null;
  saveEmbedding: (config: ProviderConfig) => void;
  clearEmbedding: () => void;
};

function readConfig(): ProviderConfig | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(PROVIDER_CONFIG_STORAGE_KEY);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as Record<string, unknown>).baseUrl === 'string' &&
      typeof (parsed as Record<string, unknown>).apiKey === 'string' &&
      typeof (parsed as Record<string, unknown>).model === 'string'
    ) {
      return parsed as ProviderConfig;
    }
    return null;
  } catch {
    return null;
  }
}

export function useProviderConfig(): UseProviderConfig {
  const [config, setConfig] = useState<ProviderConfig | null>(null);
  const [ready, setReady] = useState(false);
  const [embeddingConfig, setEmbeddingConfig] = useState<ProviderConfig | null>(
    null,
  );

  useEffect(() => {
    setConfig(readConfig());
    const raw = window.localStorage.getItem(EMBEDDING_CONFIG_STORAGE_KEY);
    if (raw !== null) {
      try {
        setEmbeddingConfig(readStoredConfig(raw));
      } catch {
        setEmbeddingConfig(null);
      }
    }
    setReady(true);
  }, []);

  const save = useCallback((next: ProviderConfig) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      PROVIDER_CONFIG_STORAGE_KEY,
      JSON.stringify(next),
    );
    setConfig(next);
  }, []);

  const clear = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(PROVIDER_CONFIG_STORAGE_KEY);
    setConfig(null);
  }, []);

  const saveEmbedding = useCallback((next: ProviderConfig) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      EMBEDDING_CONFIG_STORAGE_KEY,
      JSON.stringify(next),
    );
    setEmbeddingConfig(next);
  }, []);
  const clearEmbedding = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(EMBEDDING_CONFIG_STORAGE_KEY);
    setEmbeddingConfig(null);
  }, []);

  return {
    config,
    ready,
    save,
    clear,
    embeddingConfig,
    saveEmbedding,
    clearEmbedding,
  };
}

function readStoredConfig(raw: string): ProviderConfig | null {
  const parsed = JSON.parse(raw) as unknown;
  if (typeof parsed !== 'object' || parsed === null) return null;
  const value = parsed as Record<string, unknown>;
  if (
    typeof value.baseUrl !== 'string' ||
    typeof value.apiKey !== 'string' ||
    typeof value.model !== 'string'
  )
    return null;
  return { baseUrl: value.baseUrl, apiKey: value.apiKey, model: value.model };
}
