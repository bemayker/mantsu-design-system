import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Tree } from './Tree';

/**
 * `archived` was conveyed by `opacity-60` and nothing else, which is meaning
 * carried by appearance alone (WCAG 2.2 SC 1.4.1). In the consuming apps
 * `archived` decides whether a node may still be chosen, so a screen-reader
 * user was not told the one thing that changes what they can do.
 *
 * Downtimes' vendored copy fixed it with an always-visible badge. This is the
 * same fix split in two, so the announcement is unconditional while the
 * visible badge stays opt-in and the package's muted-only look is unchanged
 * by default.
 */

const nodes = [
  { id: 'live', label: 'Mechanical' },
  { id: 'gone', label: 'Obsolete reason', archived: true },
];

describe('Tree, archived nodes', () => {
  it('announces the archived state even when no badge is visible', () => {
    render(<Tree nodes={nodes} />);

    // Part of the row's accessible name, added to the label rather than
    // replacing it.
    expect(screen.getByRole('treeitem', { name: /Obsolete reason/ })).toHaveTextContent(
      'Archived',
    );
    expect(screen.getByRole('treeitem', { name: /^Mechanical/ })).not.toHaveTextContent(
      'Archived',
    );
  });

  it('shows a visible badge when asked', () => {
    const { container } = render(<Tree nodes={nodes} archivedBadgeVisible />);

    const badge = container.querySelector('.bg-slate-100');
    expect(badge).not.toBeNull();
    expect(badge).toHaveTextContent('Archived');
  });

  it('keeps the marker out of sight by default', () => {
    const { container } = render(<Tree nodes={nodes} />);

    expect(container.querySelector('.sr-only')).toHaveTextContent('Archived');
    expect(container.querySelector('.bg-slate-100')).toBeNull();
  });

  it('takes the wording from labels, so it can be translated', () => {
    render(<Tree nodes={nodes} archivedBadgeVisible labels={{ archivedBadge: 'Gearchiveerd' }} />);

    expect(screen.getByText('Gearchiveerd')).toBeInTheDocument();
    expect(screen.queryByText('Archived')).not.toBeInTheDocument();
  });

  it('renders nothing extra for a node that is not archived', () => {
    const { container } = render(<Tree nodes={[{ id: 'live', label: 'Mechanical' }]} />);

    expect(container.querySelector('.sr-only')).toBeNull();
    expect(container.querySelector('.bg-slate-100')).toBeNull();
  });
});
