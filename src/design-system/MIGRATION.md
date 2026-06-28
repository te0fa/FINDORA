# Migration Plan: Moving Findora to the Enterprise Design System

This document outlines the step-by-step process for migrating legacy pages to use the new Design System components in future Sprints.

---

## 📅 Roadmap Strategy

### Sprint 1 (Current)
- Establish Design Tokens, Color & Spacing systems, and Base UI/Layout Components.
- Legacy page designs remain **untouched** to protect production traffic.

### Sprint 2 (Next)
- Migrate the Public Landing Page (`src/app/[locale]/page.tsx`).
- Replace inline/ad-hoc styling blocks and custom button wrappers with the unified components:
  - `<Navbar>`
  - `<Hero>`
  - `<Button>`
  - `<Card>`
  - `<Footer>`

### Sprint 3
- Migrate Dashboards (Staff, Merchant, Customer screens).
- Integrate:
  - `<DashboardLayout>`
  - `<Grid>` / `<Stack>` layout primitives
  - Segmented `<Input>` groups
  - Dynamic `<States>` (Skeletons, empty states)

---

## 🛠️ Step-by-Step Migration Guide

When migrating an existing file (e.g., a dashboard page), follow this pattern:

### 1. Import Components
Remove local components or custom SVG icons, and import from the design system:
```tsx
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Stack, Grid } from '@/components/layout/LayoutPrimitives';
import { Plus } from 'lucide-react';
```

### 2. Replace Interactive Buttons
*Before (legacy CSS/inline classes):*
```tsx
<button className="btn-accent" onClick={submit}>
  <span>طلب جديد</span>
</button>
```

*After (Design System button):*
```tsx
<Button variant="primary" leftIcon={<Plus size={18} />} onClick={submit}>
  طلب جديد
</Button>
```

### 3. Simplify Page Layouts
*Before:*
```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
     ...
  </div>
</div>
```

*After:*
```tsx
<Stack space="var(--space-16)">
  <Grid cols={{ sm: 1, md: 2 }} gap="var(--space-20)">
     ...
  </Grid>
</Stack>
```

---

## ⚠️ Migration Safety Rules
1. **Never alter API endpoints or state hooks:** Focus strictly on the visual presentation layer (`JSX` tags).
2. **Support RTL/LTR natively:** Use logical layout properties (e.g. `marginInlineStart` or CSS spacing variables) instead of left/right absolute constraints.
3. **Verify Interactive States:** Make sure loading states (`isLoading={status === 'submitting'}`) are fully mapped to avoid double-form-submission bugs.
