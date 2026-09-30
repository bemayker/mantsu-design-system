/**
 * DT-FND-11-FB-1.1: a column can carry an accessible name (`headerLabel`)
 * apart from its visible `header`, so an actions column can keep an empty
 * header and still give its `columnheader` a name.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DataTable } from './DataTable';
import type { DataTableColumn } from './DataTable.types';

interface Plant {
  id: number;
  name: string;
}

const data: Plant[] = [{ id: 1, name: 'Antwerp Plant' }];

describe('DataTable column headerLabel', () => {
  it('renders a column without headerLabel exactly as before 2.5.0', () => {
    // Captured against 2.4.0, before `headerLabel` existed. Covers a named
    // plain header, a named sortable header and an empty header, with and
    // without sorting wired.
    const columns: DataTableColumn<Plant>[] = [
      { key: 'name', header: 'Name', sortKey: 'name' },
      { key: 'plain', header: 'Plain', render: () => 'x' },
      { key: 'actions', header: '', render: () => 'x' },
      { key: 'emptySortable', header: '', sortKey: 'emptySortable', accessor: () => 'x' },
    ];
    const { container: sorted } = render(
      <DataTable columns={columns} data={data} onSortChange={() => {}} />,
    );
    expect(sorted.querySelector('thead')?.outerHTML).toMatchInlineSnapshot(`"<thead><tr class="bg-frost"><th data-testid="data-table-header-name" aria-sort="none" class="border-b border-slate-200 text-slate-600 px-4 py-3 text-body-sm-emphasis text-left"><div class="flex items-center gap-1"><span class="flex min-w-0 flex-1 items-center gap-1 justify-start"><button type="button" data-testid="data-table-sort-name" class="group inline-flex items-center gap-1 rounded-sm outline-none hover:text-midnight focus-visible:ring-2 focus-visible:ring-primary-blue/40" aria-label="Sort by Name"><span>Name</span><span class="text-primary-blue transition-opacity opacity-0 group-hover:opacity-40"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"></path></svg></span></button></span><button type="button" aria-label="Name options" aria-haspopup="menu" class="flex shrink-0 items-center justify-center rounded-sm text-slate-400 size-6 hover:bg-slate-200/70 hover:text-midnight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue/40"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"></line><line x1="7" y1="12" x2="17" y2="12"></line><line x1="10" y1="18" x2="14" y2="18"></line></svg></button></div></th><th data-testid="data-table-header-plain" aria-sort="none" class="border-b border-slate-200 text-slate-600 px-4 py-3 text-body-sm-emphasis text-left"><div class="flex items-center gap-1"><span class="flex min-w-0 flex-1 items-center gap-1 justify-start"><span>Plain</span></span></div></th><th data-testid="data-table-header-actions" aria-sort="none" class="border-b border-slate-200 text-slate-600 px-4 py-3 text-body-sm-emphasis text-left"><div class="flex items-center gap-1"><span class="flex min-w-0 flex-1 items-center gap-1 justify-start"><span></span></span></div></th><th data-testid="data-table-header-emptySortable" aria-sort="none" class="border-b border-slate-200 text-slate-600 px-4 py-3 text-body-sm-emphasis text-left"><div class="flex items-center gap-1"><span class="flex min-w-0 flex-1 items-center gap-1 justify-start"><button type="button" data-testid="data-table-sort-emptySortable" class="group inline-flex items-center gap-1 rounded-sm outline-none hover:text-midnight focus-visible:ring-2 focus-visible:ring-primary-blue/40" aria-label="Sort by "><span></span><span class="text-primary-blue transition-opacity opacity-0 group-hover:opacity-40"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"></path></svg></span></button></span><button type="button" aria-label=" options" aria-haspopup="menu" class="flex shrink-0 items-center justify-center rounded-sm text-slate-400 size-6 hover:bg-slate-200/70 hover:text-midnight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue/40"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"></line><line x1="7" y1="12" x2="17" y2="12"></line><line x1="10" y1="18" x2="14" y2="18"></line></svg></button></div></th></tr></thead>"`);

    const { container: unsorted } = render(<DataTable columns={columns} data={data} />);
    expect(unsorted.querySelector('thead')?.outerHTML).toMatchInlineSnapshot(`"<thead><tr class="bg-frost"><th data-testid="data-table-header-name" aria-sort="none" class="border-b border-slate-200 text-slate-600 px-4 py-3 text-body-sm-emphasis text-left"><div class="flex items-center gap-1"><span class="flex min-w-0 flex-1 items-center gap-1 justify-start"><span>Name</span></span><button type="button" aria-label="Name options" aria-haspopup="menu" class="flex shrink-0 items-center justify-center rounded-sm text-slate-400 size-6 hover:bg-slate-200/70 hover:text-midnight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue/40"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"></line><line x1="7" y1="12" x2="17" y2="12"></line><line x1="10" y1="18" x2="14" y2="18"></line></svg></button></div></th><th data-testid="data-table-header-plain" aria-sort="none" class="border-b border-slate-200 text-slate-600 px-4 py-3 text-body-sm-emphasis text-left"><div class="flex items-center gap-1"><span class="flex min-w-0 flex-1 items-center gap-1 justify-start"><span>Plain</span></span></div></th><th data-testid="data-table-header-actions" aria-sort="none" class="border-b border-slate-200 text-slate-600 px-4 py-3 text-body-sm-emphasis text-left"><div class="flex items-center gap-1"><span class="flex min-w-0 flex-1 items-center gap-1 justify-start"><span></span></span></div></th><th data-testid="data-table-header-emptySortable" aria-sort="none" class="border-b border-slate-200 text-slate-600 px-4 py-3 text-body-sm-emphasis text-left"><div class="flex items-center gap-1"><span class="flex min-w-0 flex-1 items-center gap-1 justify-start"><span></span></span><button type="button" aria-label=" options" aria-haspopup="menu" class="flex shrink-0 items-center justify-center rounded-sm text-slate-400 size-6 hover:bg-slate-200/70 hover:text-midnight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue/40"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"></line><line x1="7" y1="12" x2="17" y2="12"></line><line x1="10" y1="18" x2="14" y2="18"></line></svg></button></div></th></tr></thead>"`);
  });

  it('names an empty header by its headerLabel, visually hidden', () => {
    const columns: DataTableColumn<Plant>[] = [
      { key: 'name', header: 'Name' },
      { key: 'actions', header: '', headerLabel: 'Actions', render: () => <button type="button">Edit</button> },
    ];
    render(<DataTable columns={columns} data={data} />);

    const header = screen.getByRole('columnheader', { name: 'Actions' });
    expect(header).toBe(screen.getByTestId('data-table-header-actions'));
    expect(header.querySelector('.sr-only')).toHaveTextContent('Actions');
  });

  it('uses headerLabel in the labels of a sortable empty header', () => {
    const columns: DataTableColumn<Plant>[] = [
      { key: 'score', header: '', headerLabel: 'Score', sortKey: 'score', accessor: () => 1 },
    ];
    render(<DataTable columns={columns} data={data} onSortChange={() => {}} />);

    expect(screen.getByRole('button', { name: 'Sort by Score' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Score options' })).toBeInTheDocument();
  });

  it('ignores headerLabel when header has visible text (label in name)', () => {
    const columns: DataTableColumn<Plant>[] = [
      { key: 'name', header: 'Name', headerLabel: 'Something else' },
    ];
    render(<DataTable columns={columns} data={data} filterable={false} />);

    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.queryByText('Something else')).not.toBeInTheDocument();
  });
});
