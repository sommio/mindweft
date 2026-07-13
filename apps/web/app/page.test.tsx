import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Home from './page';

describe('home page', () => {
  it('renders placeholder content', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: 'mindweft' })).toBeDefined();
  });
});
