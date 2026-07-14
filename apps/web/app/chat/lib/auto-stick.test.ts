import { describe, expect, it } from 'vitest';

import { isNearBottom } from './auto-stick';

describe('isNearBottom', () => {
  it('true when within threshold of bottom', () => {
    // scrollHeight 1000, clientHeight 800, scrollTop 180 → 180+800=980, 1000-80=920 → 980>=920
    expect(isNearBottom(180, 800, 1000, 80)).toBe(true);
  });

  it('true exactly at bottom', () => {
    expect(isNearBottom(200, 800, 1000, 80)).toBe(true);
  });

  it('false when scrolled up beyond threshold', () => {
    // scrollTop 0 → 800, 920 → false
    expect(isNearBottom(0, 800, 1000, 80)).toBe(false);
  });

  it('handles content shorter than viewport', () => {
    expect(isNearBottom(0, 800, 500, 80)).toBe(true);
  });
});
