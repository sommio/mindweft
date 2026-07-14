import { afterEach, describe, expect, it, vi } from 'vitest';

import Home from './page';

const redirectMock = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    redirectMock(path);
    throw new Error(`redirect:${path}`);
  },
}));

describe('home page', () => {
  afterEach(() => {
    redirectMock.mockClear();
  });

  it('redirects to /chat', () => {
    expect(() => {
      Home();
    }).toThrow('redirect:/chat');
    expect(redirectMock).toHaveBeenCalledWith('/chat');
  });
});
