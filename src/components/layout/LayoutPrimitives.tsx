'use client';

import React from 'react';

// ──────────────────────────────────────────────────────────────────────────
// 1. CONTAINER
// ──────────────────────────────────────────────────────────────────────────
export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'fluid';
}

export const Container: React.FC<ContainerProps> = ({ children, size = 'xl', style, className = '', ...props }) => {
  const maxWidths = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    fluid: '100%',
  };

  return (
    <div
      className={`findora-container ${className}`}
      style={{
        width: '100%',
        maxWidth: maxWidths[size],
        marginInline: 'auto',
        paddingInline: 'var(--space-16)',
        boxSizing: 'border-box',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 2. GRID
// ──────────────────────────────────────────────────────────────────────────
export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: { sm?: number; md?: number; lg?: number; xl?: number } | number;
  gap?: string;
}

export const Grid: React.FC<GridProps> = ({ children, cols = 1, gap = 'var(--space-24)', style, className = '', ...props }) => {
  // We can write simple responsive styles using inline variables or CSS selectors
  const getGridTemplateColumns = () => {
    if (typeof cols === 'number') {
      return `repeat(${cols}, minmax(0, 1fr))`;
    }
    // Set custom responsive custom properties or default to 1 on small, building up
    return `repeat(auto-fit, minmax(280px, 1fr))`;
  };

  return (
    <div
      className={`findora-grid ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: getGridTemplateColumns(),
        gap: gap,
        width: '100%',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 3. FLEX & STACK
// ──────────────────────────────────────────────────────────────────────────
export interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  align?: 'flex-start' | 'flex-end' | 'center' | 'baseline' | 'stretch';
  justify?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  gap?: string;
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
}

export const Flex: React.FC<FlexProps> = ({
  children,
  direction = 'row',
  align = 'stretch',
  justify = 'flex-start',
  gap = '0px',
  wrap = 'nowrap',
  style,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`findora-flex ${className}`}
      style={{
        display: 'flex',
        flexDirection: direction,
        alignItems: align,
        justifyContent: justify,
        gap: gap,
        flexWrap: wrap,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// Stack is a specialized Flex component with column layout
export interface StackProps extends Omit<FlexProps, 'direction'> {
  space?: string;
}

export const Stack: React.FC<StackProps> = ({ children, space = 'var(--space-16)', align = 'stretch', justify = 'flex-start', style, ...props }) => {
  return (
    <Flex direction="column" gap={space} align={align} justify={justify} style={style} {...props}>
      {children}
    </Flex>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 4. SECTION
// ──────────────────────────────────────────────────────────────────────────
export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  padding?: 'sm' | 'md' | 'lg' | 'none';
  background?: 'default' | 'surface' | 'surface-secondary';
}

export const Section: React.FC<SectionProps> = ({
  children,
  padding = 'md',
  background = 'default',
  style,
  className = '',
  ...props
}) => {
  const paddings = {
    sm: 'var(--space-32) 0',
    md: 'var(--space-64) 0',
    lg: 'var(--space-96) 0',
    none: '0',
  };

  const bgColors = {
    default: 'transparent',
    surface: 'var(--surface)',
    'surface-secondary': 'var(--surface-secondary)',
  };

  return (
    <section
      className={`findora-section ${className}`}
      style={{
        padding: paddings[padding],
        background: bgColors[background],
        width: '100%',
        position: 'relative',
        boxSizing: 'border-box',
        ...style,
      }}
      {...props}
    >
      {children}
    </section>
  );
};
