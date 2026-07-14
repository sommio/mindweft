export type KeyboardPlatform = 'desktop' | 'mobile';

export type KeyboardSendInput = {
  shift: boolean;
  isComposing: boolean;
};

/**
 * 桌面：纯 Enter 发送，Shift+Enter 换行，IME 组字中不发送。
 * 手机：Enter 永远换行，发送交给发送按钮。
 */
export function shouldSendOnEnter(
  platform: KeyboardPlatform,
  input: KeyboardSendInput,
): boolean {
  if (platform === 'mobile') return false;
  return !input.shift && !input.isComposing;
}
