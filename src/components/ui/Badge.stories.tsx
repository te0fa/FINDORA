import React from 'react';
import { Badge } from './Badge';

export default {
  title: 'Design System/UI/Badge',
  component: Badge,
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'success', 'warning', 'danger', 'gold'],
    },
    outline: { control: 'boolean' },
    animated: { control: 'boolean' },
  },
};

const Template = (args: any) => <Badge {...args}>نشط / Active</Badge>;

export const Primary = Template.bind({});
(Primary as any).args = {
  variant: 'primary',
  animated: false,
};

export const AnimatedSuccess = Template.bind({});
(AnimatedSuccess as any).args = {
  variant: 'success',
  animated: true,
};

export const GoldOutline = Template.bind({});
(GoldOutline as any).args = {
  variant: 'gold',
  outline: true,
};
