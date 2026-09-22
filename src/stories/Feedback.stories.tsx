import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Modal } from '../components/Modal';
import { SideDrawer } from '../components/SideDrawer';
import { Toast } from '../components/Toast';
import { Tooltip } from '../components/Tooltip';
import { Button } from '../components/Button';

const meta: Meta = { title: 'Components/Feedback', tags: ['autodocs'] };
export default meta;

export const ModalExample: StoryObj = {
  render: () => {
    const [open, setOpen] = React.useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open modal</Button>
        <Modal open={open} onClose={() => setOpen(false)} title="Delete order"
          footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button variant="default" onClick={() => setOpen(false)}>Delete</Button></>}>
          This action cannot be undone.
        </Modal>
      </>
    );
  },
};
export const SideDrawerExample: StoryObj = {
  render: () => {
    const [open, setOpen] = React.useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open drawer</Button>
        <SideDrawer open={open} onClose={() => setOpen(false)} title="Order details"
          footer={<Button variant="gradient" onClick={() => setOpen(false)}>Save</Button>}>
          Drawer content goes here.
        </SideDrawer>
      </>
    );
  },
};
export const Toasts: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Toast variant="success" message="Order completed" onDismiss={() => {}} />
      <Toast variant="error" message="Connection lost. Retrying…" onDismiss={() => {}} />
    </div>
  ),
};
export const TooltipExample: StoryObj = {
  render: () => (
    <div className="p-12">
      <Tooltip content="Overall Equipment Effectiveness">
        <Button variant="outline">Hover me</Button>
      </Tooltip>
    </div>
  ),
};
