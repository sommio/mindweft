import { describe, expect, it } from 'vitest';

import { computeRows } from './auto-grow';

describe('computeRows', () => {
  it('empty text is 1 row', () => {
    expect(computeRows('', 5)).toBe(1);
  });

  it('single line is 1 row', () => {
    expect(computeRows('hello', 5)).toBe(1);
  });

  it('counts newlines', () => {
    expect(computeRows('a\nb\nc', 5)).toBe(3);
  });

  it('caps at maxRows', () => {
    expect(computeRows('a\nb\nc\nd\ne\nf\ng\nh', 5)).toBe(5);
  });

  it('maxRows 1 collapses multi-line', () => {
    expect(computeRows('a\nb', 1)).toBe(1);
  });
});
