import React from 'react';
import { Card } from './Card';

export default {
  title: 'Design System/UI/Card',
  component: Card,
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'elevated', 'interactive', 'glass', 'statistics', 'feature', 'pricing'],
    },
    glow: { control: 'boolean' },
    hoverLift: { control: 'boolean' },
  },
};

const Template = (args: any) => (
  <Card {...args} style={{ maxWidth: '350px' }}>
    <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-12)' }}>بطاقة فايندورا / Findora Card</h3>
    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
      تفاصيل ومحتوى البطاقة يعبر عن لغة تصميم فايندورا الراقية. Sourcing and price optimization dashboard elements.
    </p>
  </Card>
);

export const Default = Template.bind({});
(Default as any).args = {
  variant: 'default',
};

export const Glass = Template.bind({});
(Glass as any).args = {
  variant: 'glass',
};

export const Pricing = Template.bind({});
(Pricing as any).args = {
  variant: 'pricing',
  glow: true,
};
