import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AboutModal from '../components/AboutModal';

describe('AboutModal Component', () => {
  it('renders clinical pillars and architecture details', () => {
    render(<AboutModal />);

    expect(screen.getByText(/About RenalWatch/i)).toBeDefined();
    expect(screen.getByText(/interdialytic gap/i)).toBeDefined();
    expect(screen.getByText(/Food-to-Nutrient Engine/i)).toBeDefined();
  });
});
