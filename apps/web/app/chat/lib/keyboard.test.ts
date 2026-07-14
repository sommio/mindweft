import { describe, expect, it } from 'vitest';

import { shouldSendOnEnter } from './keyboard';

describe('shouldSendOnEnter', () => {
  it('desktop: plain Enter sends', () => {
    expect(
      shouldSendOnEnter('desktop', { shift: false, isComposing: false }),
    ).toBe(true);
  });

  it('desktop: Shift+Enter does not send', () => {
    expect(
      shouldSendOnEnter('desktop', { shift: true, isComposing: false }),
    ).toBe(false);
  });

  it('desktop: IME composing does not send', () => {
    expect(
      shouldSendOnEnter('desktop', { shift: false, isComposing: true }),
    ).toBe(false);
  });

  it('mobile: never sends on Enter', () => {
    expect(
      shouldSendOnEnter('mobile', { shift: false, isComposing: false }),
    ).toBe(false);
    expect(
      shouldSendOnEnter('mobile', { shift: true, isComposing: false }),
    ).toBe(false);
  });
});
