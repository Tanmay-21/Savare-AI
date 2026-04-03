import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { PayAllConfirmModal } from './PayAllConfirmModal';

describe('PayAllConfirmModal', () => {
  const baseProps = {
    isOpen: true,
    pendingCount: 5,
    submitting: false,
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
  };

  it('renders modal when isOpen is true', () => {
    render(<PayAllConfirmModal {...baseProps} />);
    expect(screen.getByText(/pay all pending/i)).toBeInTheDocument();
  });

  it('does not render modal content when isOpen is false', () => {
    render(<PayAllConfirmModal {...baseProps} isOpen={false} />);
    expect(screen.queryByText(/pay all pending/i)).not.toBeInTheDocument();
  });

  it('displays the pending count in the description', () => {
    render(<PayAllConfirmModal {...baseProps} pendingCount={7} />);
    expect(screen.getByText(/7/)).toBeInTheDocument();
  });

  it('calls onCancel when Cancel button is clicked', async () => {
    const onCancel = vi.fn();
    render(<PayAllConfirmModal {...baseProps} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when Confirm All button is clicked', async () => {
    const onConfirm = vi.fn();
    render(<PayAllConfirmModal {...baseProps} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: /confirm all/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables the confirm button when submitting is true', () => {
    render(<PayAllConfirmModal {...baseProps} submitting={true} />);
    const confirmButton = screen.getByRole('button', { name: /confirm all/i });
    expect(confirmButton).toBeDisabled();
  });
});
