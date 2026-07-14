'use client';

import { useEffect, useState } from 'react';

/**
 * 监听浏览器在线/离线状态。离线时聊天发送被禁用，不创建发送队列、
 * 不自动补发；恢复联网后由用户重新发送。
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
    };
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}
