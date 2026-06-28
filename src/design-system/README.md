# Findora Enterprise Design System Documentation

Welcome to the Findora Enterprise Design System. This repository contains the unified visual language and reusable component foundation for the entire Findora platform.

---

## 🚀 Getting Started

### 1. Structure Overview
- `src/design-system/theme/tokens.css` - Global CSS variable design tokens (Colors, Typography, Spacing, Transitions).
- `src/lib/design-system/motion.ts` - Standard Framer Motion animations & transitions.
- `src/components/ui/` - Pure UI components (Button, Input, Card, Badge, Avatar, Toast, Alert, EmptyState, Skeleton, etc.).
- `src/components/layout/` - Structural layout primitives (Container, Flex, Stack, Grid, DashboardLayout, Navbar, Footer).

---

## 🎨 Color System (Semantic)

Colors are defined as CSS variables. Always use variables instead of raw hex values:

| Token | Dark Theme | Light Theme (Future) | Usage |
| :--- | :--- | :--- | :--- |
| `--primary` | `#f8fafc` | `#0f172a` | Core interactive actions, titles |
| `--accent` | `#c8973b` (Gold) | `#b08130` | Findora signature highlights |
| `--background` | `#020617` | `#f8fafc` | Main screen body background |
| `--surface` | `#0b0f19` | `#ffffff` | Panels, drawers, list blocks |
| `--border` | `rgba(255,255,255,0.08)` | `rgba(15,23,42,0.08)` | Outer boundaries, card borders |
| `--success` | `#22c55e` | `#16a34a` | Completed actions, verified steps |
| `--danger` | `#ef4444` | `#dc2626` | Destructive items, errors |

---

## 📐 Spacing System

Our spacing scale is built on a `4px` grid to guarantee layout math is perfectly clean:

```css
--space-4: 4px;
--space-8: 8px;
--space-12: 12px;
--space-16: 16px;
--space-20: 20px;
--space-24: 24px;
--space-32: 32px;
--space-40: 40px;
--space-48: 48px;
```

---

## 📝 Typography scale

We support Cairo for Arabic and Inter for English, using semantic font classes:

- `.font-display-xl` (3.5rem): Big landing banners
- `.font-display-lg` (2.75rem): Core headers
- `.font-h1` (2.25rem): Section titles
- `.font-h2` (1.75rem): Sub-section titles
- `.font-body` (1rem): Standard descriptive text
- `.font-button` (0.95rem): Text labels on buttons
- `.font-caption` (0.75rem): Small helpers, dates

---

## ⚡ Motion & Animations

All animations use Framer Motion constants exported from `@/lib/design-system/motion`:
- **Page transitions:** `pageTransitionVariants`
- **Dialogs & Overlay Modals:** `backdropVariants` and `modalVariants`
- **Cards Hover Scale-up:** `cardHoverVariants`
- **Accordions & FAQ toggles:** `accordionVariants`

---

## ♿ Accessibility (A11y)

1. **Aria Attributes:** Checkboxes, inputs, modals, and buttons have built-in `aria-disabled`, `aria-busy`, and `role="dialog"` attributes.
2. **Keyboard Navigation:** Modals listen to standard `Escape` keys to close automatically, and interactive controls support standard browser tab focus outlines.
3. **Contrast:** All text variations pass AA contrast guidelines against dark-mode surfaces.
