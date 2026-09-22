import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Toast } from './Toast';
import { ToastProvider } from './ToastProvider';
import { useToast } from './useToast';

describe('Toast', () => {
  it('renders the success variant with role="status" and the message', () => {
    render(<Toast variant="success" message="Plant saved successfully." onDismiss={vi.fn()} />);

    const toast = screen.getByTestId('toast-success');
    expect(toast).toHaveAttribute('role', 'status');
    expect(toast).toHaveTextContent('Plant saved successfully.');
  });

  it('renders the error variant with role="alert"', () => {
    render(<Toast variant="error" message="Failed to save." onDismiss={vi.fn()} />);

    expect(screen.getByTestId('toast-error')).toHaveAttribute('role', 'alert');
  });

  it('calls onDismiss when the dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(<Toast variant="success" message="Saved." onDismiss={onDismiss} />);

    fireEvent.click(screen.getByTestId('toast-dismiss-button-success'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

function ToastTrigger() {
  const toast = useToast();
  return (
    <div className="flex gap-2">
      <button type="button" data-testid="trigger-success" onClick={() => toast.success('Saved!')}>
        Trigger success
      </button>
      <button type="button" data-testid="trigger-error" onClick={() => toast.error('Failed!')}>
        Trigger error
      </button>
    </div>
  );
}

describe('ToastProvider + useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a queued toast in the viewport when useToast().success is called', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('trigger-success'));
    });

    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });

  it('auto-dismisses a toast after the configured duration', () => {
    render(
      <ToastProvider durationMs={1000}>
        <ToastTrigger />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('trigger-error'));
    });
    expect(screen.getByText('Failed!')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByText('Failed!')).not.toBeInTheDocument();
  });

  it('dismisses a toast manually before the auto-dismiss timer fires', () => {
    render(
      <ToastProvider durationMs={5000}>
        <ToastTrigger />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('trigger-success'));
    });
    const dismissButtons = screen.getAllByRole('button', { name: 'Dismiss' });
    act(() => {
      fireEvent.click(dismissButtons[0]);
    });

    expect(screen.queryByText('Saved!')).not.toBeInTheDocument();
  });

  it('caps the queue at maxToasts, dropping the oldest toast', () => {
    render(
      <ToastProvider durationMs={10000} maxToasts={2}>
        <ToastTrigger />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('trigger-success'));
    });
    act(() => {
      fireEvent.click(screen.getByTestId('trigger-success'));
    });
    act(() => {
      fireEvent.click(screen.getByTestId('trigger-error'));
    });

    expect(screen.getAllByText('Saved!')).toHaveLength(1);
    expect(screen.getByText('Failed!')).toBeInTheDocument();
  });

  it('clears pending auto-dismiss timers on unmount, so no state update fires afterwards', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = render(
      <ToastProvider durationMs={1000}>
        <ToastTrigger />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('trigger-success'));
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
    cleanup();
  });
});
