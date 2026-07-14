'use client';

import { useCallback, useEffect, useState } from 'react';

import type { ProviderConfig } from './provider-config';

export const PROVIDER_CONFIG_STORAGE_KEY = 'mindweft.provider-config';

export type UseProviderConfig = {
  config: ProviderConfig | null;
  ready: boolean;
  save: (config: ProviderConfig) => void;
  clear: () => void;
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

  useEffect(() => {
    setConfig(readConfig());
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

  return { config, ready, save, clear };
}
