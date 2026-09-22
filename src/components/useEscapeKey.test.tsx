import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Dropdown } from './Dropdown';
import { Modal } from './Modal';
import { SideDrawer } from './SideDrawer';
import { useEscapeKey } from './useEscapeKey';

/**
 * These are composition tests, and that is the point of them.
 *
 * Every overlay in this package used to attach its own `document` keydown
 * listener, which is correct in isolation and wrong the moment two are open:
 * one Escape press reached both. Each component's own suite opens exactly one
 * overlay, so all of them passed while a dropdown inside a modal closed the
 * modal too.
 *
 * Three of the composition cases below were run against the old shape and
 * fail on it: the dropdown-inside-a-modal case, the one after it, and the two
 * stacked modals. The rest document the hook's contract rather than guarding
 * that regression.
 *
 * **They fire on `document`, deliberately.** A `keydown` dispatched on
 * `window` never reaches a `document` listener, so an earlier draft of these
 * tests passed against the buggy implementation for no better reason than the
 * event target. `document` bubbles up to the `window` listener the hook
 * attaches *and* reaches a `document` listener directly, so it exercises both
 * shapes and can tell them apart.
 */

function Registrant({ active, onEscape }: { active: boolean; onEscape: () => void }) {
  useEscapeKey(active, onEscape);
  return null;
}

const options = [
  { value: 'be', label: 'Belgium' },
  { value: 'nl', label: 'Netherlands' },
];

describe('useEscapeKey', () => {
  it('fires only the topmost registrant', () => {
    const outer = vi.fn();
    const inner = vi.fn();

    render(
      <>
        <Registrant active onEscape={outer} />
        <Registrant active onEscape={inner} />
      </>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
  });

  it('hands the press back to the one underneath once the top one unmounts', () => {
    const outer = vi.fn();
    const inner = vi.fn();

    const { rerender } = render(
      <>
        <Registrant active onEscape={outer} />
        <Registrant active onEscape={inner} />
      </>,
    );
    rerender(
      <>
        <Registrant active onEscape={outer} />
        <Registrant active={false} onEscape={inner} />
      </>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(outer).toHaveBeenCalledTimes(1);
    expect(inner).not.toHaveBeenCalled();
  });

  it('ignores a key that is not Escape', () => {
    const onEscape = vi.fn();

    render(<Registrant active onEscape={onEscape} />);
    fireEvent.keyDown(document, { key: 'Enter' });

    expect(onEscape).not.toHaveBeenCalled();
  });

  it('does not register while inactive', () => {
    const onEscape = vi.fn();

    render(<Registrant active={false} onEscape={onEscape} />);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onEscape).not.toHaveBeenCalled();
  });
});

describe('Escape across composed overlays', () => {
  it('closes a dropdown inside a modal without closing the modal', () => {
    const onClose = vi.fn();

    render(
      <Modal open onClose={onClose} title="Report">
        <Dropdown options={options} value={null} onChange={() => {}} />
      </Modal>,
    );

    fireEvent.click(screen.getByTestId('custom-dropdown-trigger'));
    expect(screen.getByTestId('custom-dropdown-options')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    // The dropdown took the press.
    expect(screen.queryByTestId('custom-dropdown-options')).not.toBeInTheDocument();
    // And the dialog the operator was filling in is still there. This is the
    // assertion that fails against a listener-per-overlay implementation.
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes the modal on the next press, once the dropdown is closed', () => {
    const onClose = vi.fn();

    render(
      <Modal open onClose={onClose} title="Report">
        <Dropdown options={options} value={null} onChange={() => {}} />
      </Modal>,
    );

    fireEvent.click(screen.getByTestId('custom-dropdown-trigger'));
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes a dropdown inside a side drawer without closing the drawer', () => {
    const onClose = vi.fn();

    render(
      <SideDrawer open onClose={onClose} title="Filters">
        <Dropdown options={options} value={null} onChange={() => {}} />
      </SideDrawer>,
    );

    fireEvent.click(screen.getByTestId('custom-dropdown-trigger'));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByTestId('custom-dropdown-options')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes only the inner modal when two are stacked', () => {
    const closeOuter = vi.fn();
    const closeInner = vi.fn();

    render(
      <>
        <Modal open onClose={closeOuter} title="Outer">
          <p>outer body</p>
        </Modal>
        <Modal open onClose={closeInner} title="Inner">
          <p>inner body</p>
        </Modal>
      </>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(closeInner).toHaveBeenCalledTimes(1);
    expect(closeOuter).not.toHaveBeenCalled();
  });

  it('a modal opened after another still takes the press', () => {
    function Stack() {
      const [innerOpen, setInnerOpen] = useState(false);
      return (
        <>
          <Modal open onClose={() => {}} title="Outer">
            <button onClick={() => setInnerOpen(true)}>open inner</button>
          </Modal>
          <Modal open={innerOpen} onClose={() => setInnerOpen(false)} title="Inner">
            <p>inner body</p>
          </Modal>
        </>
      );
    }

    render(<Stack />);
    fireEvent.click(screen.getByText('open inner'));
    expect(screen.getByText('Inner')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    // The later-opened modal is the topmost registrant even though it is
    // declared second and mounted later, which is what the `active` flag
    // rather than conditional mounting buys.
    expect(screen.queryByText('Inner')).not.toBeInTheDocument();
    expect(screen.getByText('Outer')).toBeInTheDocument();
  });
});
