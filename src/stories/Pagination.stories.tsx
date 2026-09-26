import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Pagination, getPageRange } from '../components/Pagination';

const meta: Meta<typeof Pagination> = {
  title: 'Components/Pagination',
  component: Pagination,
  tags: ['autodocs'],
};
export default meta;

const labels = { first: 'First page', previous: 'Previous page', next: 'Next page', last: 'Last page' };

const Paged = ({ total, pageSize, showFirstLast }: { total: number; pageSize: number; showFirstLast?: boolean }) => {
  const [page, setPage] = useState(1);
  const range = getPageRange(page, pageSize, total);
  return (
    <Pagination
      page={range.page}
      pageCount={range.pageCount}
      onPageChange={setPage}
      summary={`${range.from} to ${range.to} of ${total}`}
      labels={labels}
      showFirstLast={showFirstLast}
      testId="story-pager"
    />
  );
};

export const Default: StoryObj = { render: () => <Paged total={23} pageSize={10} /> };

export const SinglePage: StoryObj = { render: () => <Paged total={4} pageSize={10} /> };

export const WithoutFirstAndLast: StoryObj = {
  render: () => <Paged total={57} pageSize={10} showFirstLast={false} />,
};
