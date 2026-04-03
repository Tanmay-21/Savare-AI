import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ToastProvider, useToast } from './ToastContext';

function TestConsumer() {
  const { showToast } = useToast();
  return (
    <button onClick={() => showToast('Test message', 'success')}>trigger</button>
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('ToastContext', () => {
  it('renders children without toasts by default', () => {
    render(
      <ToastProvider>
        <div>hello</div>
      </ToastProvider>
    );
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('shows a toast when showToast is called', async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );
    await user.click(screen.getByText('trigger'));
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('can be manually dismissed via close button', async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );
    await user.click(screen.getByText('trigger'));
    expect(screen.getByText('Test message')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    await waitFor(() => {
      expect(screen.queryByText('Test message')).not.toBeInTheDocument();
    });
  });

  it('shows multiple toasts simultaneously', async () => {
    const user = userEvent.setup({ delay: null });

    function MultiTrigger() {
      const { showToast } = useToast();
      return (
        <>
          <button onClick={() => showToast('First', 'success')}>first</button>
          <button onClick={() => showToast('Second', 'error')}>second</button>
        </>
      );
    }

    render(
      <ToastProvider>
        <MultiTrigger />
      </ToastProvider>
    );

    await user.click(screen.getByText('first'));
    await user.click(screen.getByText('second'));

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('throws if useToast is used outside ToastProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Broken() {
      useToast();
      return null;
    }
    expect(() => render(<Broken />)).toThrow('useToast must be used within a ToastProvider');
    consoleError.mockRestore();
  });
});
