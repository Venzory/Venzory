# UI Stack Documentation

## Overview
This document clarifies the UI architecture of the project to avoid confusion for future developers.

## Key Takeaways

1.  **No shadcn/ui**: This project does **NOT** use the shadcn/ui library or its CLI tool. There is no `components.json` configuration.
2.  **Custom Components**: The components located in `components/ui/` are **custom-built** implementations.
    *   They use standard Tailwind CSS classes directly.
    *   They do **not** use `class-variance-authority` (cva).
    *   They do **not** use Radix UI primitives (e.g., our `Select` wraps a native HTML `<select>`, and `DropdownMenu` uses custom React state).
3.  **Radix UI Status**: While `@radix-ui/react-slot` is installed, the project does **not** use Radix UI component primitives (like Dialog, Select, Popover, etc.).
4.  **Similarities**: The project adopts a similar folder structure (`components/ui`) and utility pattern (`cn` helper using `clsx` and `tailwind-merge`) to shadcn projects, but the component implementations are fully custom.

## Current Stack
The UI layer is built using:
*   **Styling**: Tailwind CSS
*   **Icons**: `lucide-react`
*   **Components**: Custom React components (in `components/ui/`)
*   **Utilities**: `clsx` + `tailwind-merge` (exposed as `cn`)

**Note to Developers**: Do not attempt to run shadcn CLI commands (`npx shadcn@latest add ...`) as they may conflict with the existing custom architecture.

