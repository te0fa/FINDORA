import React from 'react';
import { Button } from './Button';

export default {
  title: 'Design System/UI/Button',
  component: Button,
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger', 'success'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    isLoading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

const Template = (args: any) => <Button {...args}>تسوق الآن / Shop Now</Button>;

export const Primary = Template.bind({});
(Primary as any).args = {
  variant: 'primary',
  size: 'md',
  isLoading: false,
  disabled: false,
};

export const Secondary = Template.bind({});
(Secondary as any).args = {
  variant: 'secondary',
  size: 'md',
};

export const Outline = Template.bind({});
(Outline as any).args = {
  variant: 'outline',
  size: 'md',
};

export const Ghost = Template.bind({});
(Ghost as any).args = {
  variant: 'ghost',
  size: 'md',
};

export const Danger = Template.bind({});
(Danger as any).args = {
  variant: 'danger',
  size: 'md',
};

export const Success = Template.bind({});
(Success as any).args = {
  variant: 'success',
  size: 'md',
};
