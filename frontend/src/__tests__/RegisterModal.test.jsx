import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RegisterModal from '../components/RegisterModal';

describe('RegisterModal Component', () => {
  it('renders essential clinical registration fields without OTP dependencies', () => {
    render(
      <RegisterModal
        onRegisterSuccess={vi.fn()}
        onSwitchToLogin={vi.fn()}
      />
    );

    // Checks essential fields
    expect(screen.getByText(/Full Name \*/i)).toBeDefined();
    expect(screen.getByText(/Age \*/i)).toBeDefined();
    expect(screen.getByText(/Target Dry Weight \(kg\) \*/i)).toBeDefined();
    expect(screen.getByText(/Daily Fluid Limit \(mL\)/i)).toBeDefined();
    expect(screen.getByText(/Dialysis Schedule/i)).toBeDefined();
    expect(screen.getByText(/PIN \/ Password \*/i)).toBeDefined();
    expect(screen.getByText(/Register & Open My Dashboard/i)).toBeDefined();
  });
});
