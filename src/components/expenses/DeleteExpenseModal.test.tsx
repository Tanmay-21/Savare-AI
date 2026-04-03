import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { DeleteExpenseModal } from './DeleteExpenseModal';

describe('DeleteExpenseModal', () => {
  const baseProps = {
    isOpen: true,
    submitting: false,
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
  };

  it('renders the modal when isOpen is true', () => {
    render(<DeleteExpenseModal {...baseProps} />);
    expect(screen.getByText(/delete expense/i)).toBeInTheDocument();
  });

  it('does not render modal content when isOpen is false', () => {
    render(<DeleteExpenseModal {...baseProps} isOpen={false} />);
    expect(screen.queryByText(/delete expense/i)).not.toBeInTheDocument();
  });

  it('calls onCancel when Cancel button is clicked', async () => {
    const onCancel = vi.fn();
    render(<DeleteExpenseModal {...baseProps} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when Delete button is clicked', async () => {
    const onConfirm = vi.fn();
    render(<DeleteExpenseModal {...baseProps} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables the confirm button when submitting is true', () => {
    render(<DeleteExpenseModal {...baseProps} submitting={true} />);
    const deleteButton = screen.getByRole('button', { name: /deleting|delete/i });
    expect(deleteButton).toBeDisabled();
  });

  it('shows loading indicator when submitting', () => {
    render(<DeleteExpenseModal {...baseProps} submitting={true} />);
    // The button text changes to "Deleting..." or a loader is shown
    expect(screen.getByRole('button', { name: /deleting/i })).toBeInTheDocument();
  });
});
