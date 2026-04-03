import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { TripExpenseModal } from './TripExpenseModal';
import type { Shipment } from '../../types';

const MOCK_TRIP: Shipment = {
  id: 's1',
  tripId: 'T-001',
  containerNumber: 'CONT-123',
  origin: 'Mumbai',
  destination: 'Delhi',
  status: 'delivered',
  vehicleNumber: 'MH01AB1234',
};

describe('TripExpenseModal', () => {
  const baseExpenseItems = [{ category: 'Fuel' as const, amount: '500', description: '' }];

  const baseProps = {
    isOpen: true,
    selectedTrip: MOCK_TRIP,
    expenseItems: baseExpenseItems,
    setExpenseItems: vi.fn(),
    existingExpenses: [],
    submitting: false,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
  };

  it('renders the modal when isOpen is true', () => {
    render(<TripExpenseModal {...baseProps} />);
    expect(screen.getByText(/add trip expenses/i)).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<TripExpenseModal {...baseProps} isOpen={false} />);
    expect(screen.queryByText(/add trip expenses/i)).not.toBeInTheDocument();
  });

  it('displays the trip ID and vehicle number in the header', () => {
    render(<TripExpenseModal {...baseProps} />);
    expect(screen.getByText(/T-001/)).toBeInTheDocument();
    expect(screen.getByText(/MH01AB1234/)).toBeInTheDocument();
  });

  it('calls onClose when Skip button is clicked', async () => {
    const onClose = vi.fn();
    render(<TripExpenseModal {...baseProps} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /skip/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSubmit when form is submitted', async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(<TripExpenseModal {...baseProps} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: /confirm completion/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables the submit button when submitting is true', () => {
    render(<TripExpenseModal {...baseProps} submitting={true} />);
    const submitButton = screen.getByRole('button', { name: /confirm completion/i });
    expect(submitButton).toBeDisabled();
  });

  it('shows existing expenses when provided', () => {
    const existingExpenses = [
      { id: 'e1', category: 'Fuel', amount: 500, date: '2026-01-01', tripId: 's1' },
    ];
    render(<TripExpenseModal {...baseProps} existingExpenses={existingExpenses} />);
    // The amount is unique and only appears in the table row
    expect(screen.getByText('₹500')).toBeInTheDocument();
  });

  it('shows "No expenses recorded yet" when existingExpenses is empty', () => {
    render(<TripExpenseModal {...baseProps} existingExpenses={[]} />);
    expect(screen.getByText(/no expenses recorded yet/i)).toBeInTheDocument();
  });
});
