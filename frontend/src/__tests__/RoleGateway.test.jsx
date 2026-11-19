import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RoleGateway from '../components/RoleGateway';

describe('RoleGateway Component', () => {
  it('renders role options for Dialysis Patient and Clinic Management', () => {
    render(
      <RoleGateway
        onSelectPatient={vi.fn()}
        onEnterAsClinician={vi.fn()}
        onOpenRegisterModal={vi.fn()}
      />
    );

    expect(screen.getAllByText(/Dialysis Patient/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Clinic Management/i).length).toBeGreaterThanOrEqual(1);
  });

  it('triggers register modal when register link is clicked', () => {
    const mockOpenRegister = vi.fn();

    render(
      <RoleGateway
        onSelectPatient={vi.fn()}
        onEnterAsClinician={vi.fn()}
        onOpenRegisterModal={mockOpenRegister}
      />
    );

    const regBtn = screen.getByText(/First time dialysis patient\? Register your profile here/i);
    fireEvent.click(regBtn);
    expect(mockOpenRegister).toHaveBeenCalled();
  });
});
