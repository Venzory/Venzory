# Remcura Style Guide

## Overview

The Remcura Style Guide is a comprehensive visual reference for all design tokens, typography, components, and UI patterns used throughout the application.

## Accessing the Style Guide

Visit `/style-guide` in your local development environment or production deployment to view the interactive style guide.

## What's Included

### Design Tokens
- **Colors**: Brand colors, surfaces, text colors, borders, semantic colors (success, warning, danger), and sidebar-specific colors
- **Border Radii**: Small (lg), Medium (xl), Large (2xl), and Full (pill)
- **Shadows**: Small, Medium, and Large elevation levels
- **Spacing Scale**: Common padding, margin, and gap utilities

### Typography
- Heading styles (h1-h6)
- Body text variants (large, default, small)
- Label text
- Muted and secondary text
- Code text formatting

### Components
- **Buttons**: Primary, secondary, danger, and ghost variants with different sizes and states
- **Cards**: Standard, elevated, and interactive cards
- **Forms**: Text inputs, search inputs, selects, checkboxes, toggles, and textareas
- **PageHeader**: Reusable page header with title, subtitle, actions, and breadcrumbs
- **Badges**: General badges and status-specific badges
- **Tabs**: Tabbed navigation component
- **DataTable**: Responsive table component
- **DropdownMenu**: Accessible dropdown menu with keyboard navigation
- **Toast Notifications**: User feedback system

### Accessibility
- Color contrast guidelines (WCAG 2.1 AA/AAA)
- Click target size recommendations
- Focus styles and keyboard navigation patterns

## Design Tokens Location

Design tokens are defined in two primary locations:

1. **`tailwind.config.ts`**: Tailwind theme extensions including color mappings and shadow utilities
2. **`app/globals.css`**: CSS custom properties for colors, shadows, and component-specific tokens

All color tokens use CSS custom properties (e.g., `--color-brand-primary`) that automatically adapt to light and dark modes.

## Light & Dark Mode

Theme switching is powered by:
- **`next-themes`**: Theme provider and hook (`useTheme`)
- **`ThemeProvider`**: Wraps the app in `app/providers.tsx`
- **Bootstrap script**: Prevents FOUC in `app/layout.tsx`

The theme is applied by adding/removing the `dark` class on the `<html>` element.

## Typography

Remcura uses **Plus Jakarta Sans** as the primary font family, loaded via Google Fonts in `app/layout.tsx`. The font is applied globally through the body element.

## Component Organization

### Reusable UI Components
Location: `components/ui/`

Includes:
- `button.tsx` - Button component with variants
- `card.tsx` - Card components (Card, CardHeader, CardTitle, CardContent)
- `input.tsx` - Text input with label and error states
- `badge.tsx` - Badge component with variants
- `status-badge.tsx` - Status-specific badge wrapper
- `tabs.tsx` - Tab navigation components
- `data-table.tsx` - Responsive table component
- `dropdown-menu.tsx` - Dropdown menu with accessibility
- Other UI primitives

### Layout Components
Location: `components/layout/`

Includes:
- `PageHeader.tsx` - Standardized page header
- `sidebar.tsx` - Main navigation sidebar
- `topbar.tsx` - Top navigation bar
- `theme-toggle.tsx` - Light/dark mode toggle

### Style Guide Helpers
Location: `components/style-guide/`

Internal components used only within the style guide:
- `StyleSection.tsx` - Section wrapper
- `TokenCard.tsx` - Token display card
- `ColorGrid.tsx` - Color token grid
- `TypographySample.tsx` - Typography sample with computed styles
- `ComponentShowcase.tsx` - Component preview with code examples

## Adding New Components

When creating new components:

1. **Use existing design tokens** - Don't create new colors or spacing values
2. **Place in appropriate directory** - UI primitives in `components/ui/`, layout components in `components/layout/`
3. **Support light and dark modes** - Test both themes
4. **Follow accessibility guidelines** - Ensure proper contrast, focus states, and keyboard navigation
5. **Document in style guide** - Add examples to `/style-guide` page if the component is widely reusable

## Updating Styles Safely

To update styles across the application:

1. **Modify tokens, not individual components** - Change CSS custom properties in `globals.css` or Tailwind config
2. **Test both themes** - Always verify changes in light and dark modes
3. **Check the style guide** - Ensure changes don't break existing patterns
4. **Update documentation** - Keep the style guide in sync with any changes

## Best Practices

- **Consistency**: Always refer to the style guide when building new features
- **Accessibility**: Follow WCAG 2.1 AA standards for contrast and interaction
- **Responsiveness**: Test on mobile, tablet, and desktop viewports
- **Performance**: Use existing components rather than creating duplicates
- **Maintainability**: Keep design tokens centralized and well-documented

## Related Documentation

- [Architecture Documentation](./ARCHITECTURE.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [README](./README.md)

---

**Last Updated**: November 2025

