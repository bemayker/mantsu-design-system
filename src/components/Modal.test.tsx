import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Modal } from './Modal';

describe('Modal', () => {
  it('renders nothing while closed', () => {
    render(<Modal open={false} onClose={() => undefined} title="Hidden" testId="m" />);
    expect(screen.queryByTestId('m')).toBeNull();
  });

  it('is a named dialog with its supporting line', () => {
    render(<Modal open onClose={() => undefined} title="Rename" subtitle="Give it a new name" testId="m" />);
    const dialog = screen.getByRole('dialog', { name: 'Rename' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Give it a new name');
  });

  it('closes from the close button, the backdrop and Escape', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Rename" closeLabel="Sluiten" testId="m" />);

    fireEvent.click(screen.getByRole('button', { name: 'Sluiten' }));
    fireEvent.mouseDown(screen.getByTestId('m-backdrop'));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('does not close on a press that starts inside the panel', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Rename" testId="m"><p>Body</p></Modal>);

    fireEvent.mouseDown(screen.getByText('Body'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('locks every dismissal path when not dismissible', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Saving" dismissible={false} testId="m" />);

    fireEvent.click(screen.getByTestId('m-close'));
    fireEvent.mouseDown(screen.getByTestId('m-backdrop'));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('m-close')).toBeDisabled();
  });

  it('renders the action row, also through the deprecated footer', () => {
    const { rerender } = render(
      <Modal open onClose={() => undefined} title="A" actions={<button type="button">Save</button>} />,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();

    rerender(<Modal open onClose={() => undefined} title="A" footer={<button type="button">Keep</button>} />);
    expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
  });

  it('moves focus in, traps Tab, and restores focus on close', async () => {
    const user = userEvent.setup();
    const Harness = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Open</button>
          <Modal open={open} onClose={() => setOpen(false)} title="Trap" closeLabel="Close" testId="m"
            actions={<button type="button">Save</button>} />
        </>
      );
    };
    render(<Harness />);

    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
  });

  it('leaves focus on a child that took it on mount', () => {
    const AutoFocus = () => <input aria-label="Search" ref={(el) => el?.focus()} />;
    render(<Modal open onClose={() => undefined} title="Pick"><AutoFocus /></Modal>);
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveFocus();
  });
});
