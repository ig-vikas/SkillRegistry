import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SecurityBadge } from '../security-badge';

describe('SecurityBadge', () => {
  it('renders score', () => {
    render(<SecurityBadge score={95} />);
    expect(screen.getByLabelText('Security score 95 out of 100').textContent).toBe('95');
  });
});
