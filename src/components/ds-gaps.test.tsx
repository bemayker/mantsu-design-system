import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Dropdown } from './Dropdown';
import { SideDrawer } from './SideDrawer';
import { Tabs, tabPanelId } from './Tabs';
import { Toast } from './Toast';

/** The four gaps UI-20.5 found when Lists moved onto the package (2.4.0). */
describe('UI-20.5 gaps', () => {
  it('Dropdown points at the first match while searching, so Enter picks it', () => {
    const onChange = vi.fn();
    render(
      <Dropdown options={[{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }]} value={null}
        onChange={onChange} searchable testId="dd" ariaLabel="Pick" />,
    );

    fireEvent.click(screen.getByTestId('dd-trigger'));
    const search = screen.getByTestId('dd-search');
    fireEvent.change(search, { target: { value: 'bet' } });
    fireEvent.keyDown(search, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('Dropdown names its clear button with clearLabel', () => {
    render(
      <Dropdown options={[{ value: 'a', label: 'Alpha' }]} value="a" onChange={() => undefined}
        clearLabel="Selectie wissen" testId="dd" ariaLabel="Pick" />,
    );
    expect(screen.getByRole('button', { name: 'Selectie wissen' })).toBeInTheDocument();
  });

  it('Tabs carry a test id per tab and link to their panels', () => {
    render(<Tabs items={[{ id: 'one', label: 'One' }]} testIdPrefix="t" associatePanels />);
    const tab = screen.getByTestId('t-one');
    expect(tab).toHaveAttribute('aria-controls', tabPanelId('t', 'one'));
    expect(tab).toHaveAttribute('id', 't-one');
  });

  it('SideDrawer takes a test id and a translated close label', () => {
    const onClose = vi.fn();
    render(<SideDrawer open onClose={onClose} title="Details" testId="drawer" closeLabel="Sluiten">x</SideDrawer>);
    fireEvent.click(screen.getByRole('button', { name: 'Sluiten' }));
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByTestId('drawer')).toBeInTheDocument();
  });

  it('Toast has an info variant, announced politely', () => {
    render(<Toast variant="info" message="No changes to save" onDismiss={() => undefined} />);
    expect(screen.getByRole('status')).toHaveTextContent('No changes to save');
  });
});
