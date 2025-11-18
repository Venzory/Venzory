'use client';

import { useState } from 'react';
import { Search, Package, ChevronRight } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { StyleSection } from '@/components/style-guide/StyleSection';
import { ColorGrid } from '@/components/style-guide/ColorGrid';
import { TokenCard } from '@/components/style-guide/TokenCard';
import { TypographySample } from '@/components/style-guide/TypographySample';
import { ComponentShowcase } from '@/components/style-guide/ComponentShowcase';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DataTable } from '@/components/ui/data-table';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/layout/PageHeader';
import { useToastContext } from '@/lib/toast';

export default function StyleGuidePage() {
  const { addToast } = useToastContext();
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadingDemo = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-10">
      {/* Header with Theme Toggle */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Remcura Style Guide
          </h1>
          <p className="max-w-3xl text-base text-slate-600 dark:text-slate-300">
            A comprehensive reference for all design tokens, typography, components, and UI patterns used in Remcura.
            This guide ensures consistency across the application and serves as the single source of truth for design decisions.
          </p>
        </div>
        <ThemeToggle />
      </div>

      {/* Documentation Block */}
      <Card>
        <CardHeader>
          <CardTitle>About This Style Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Purpose</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              This style guide documents all design tokens, components, and patterns used throughout Remcura. 
              Use it as a reference when building new features or updating existing ones to maintain visual consistency.
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Design Tokens</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Design tokens are defined in <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">tailwind.config.ts</code> and{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">app/globals.css</code>. 
              All colors use CSS custom properties (e.g., <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">--color-brand-primary</code>) 
              that automatically adapt to light and dark modes.
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Light & Dark Mode</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Theme switching is powered by <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">next-themes</code> and{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">ThemeProvider</code>. 
              The theme is applied by adding/removing the <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">dark</code> class 
              on the <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">&lt;html&gt;</code> element. 
              A bootstrap script in <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">layout.tsx</code> prevents FOUC.
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Typography</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Remcura uses <strong>Plus Jakarta Sans</strong> as the primary font family for all text. 
              Headings use bold weights (600-700) while body text uses normal to medium weights (400-500).
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Adding New Components</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              When creating new components, use existing design tokens and patterns from this guide. 
              Place reusable UI primitives in <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">components/ui/</code> and 
              layout components in <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">components/layout/</code>. 
              Always test in both light and dark modes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Design Tokens Section */}
      <StyleSection
        title="Design Tokens"
        description="Core design tokens including colors, spacing, shadows, and border radii."
      >
        {/* Colors */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Colors</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            All color tokens are defined as CSS custom properties and automatically adapt to the current theme. 
            Each swatch shows the light mode color on the left and dark mode color on the right.
          </p>
          <ColorGrid />
        </div>

        {/* Border Radii */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Border Radii</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TokenCard
              name="Small (lg)"
              preview={<div className="h-12 w-12 rounded-lg bg-sky-600" />}
              tailwindClass="rounded-lg"
              value="0.5rem (8px)"
            />
            <TokenCard
              name="Medium (xl)"
              preview={<div className="h-12 w-12 rounded-xl bg-sky-600" />}
              tailwindClass="rounded-xl"
              value="0.75rem (12px)"
            />
            <TokenCard
              name="Large (2xl)"
              preview={<div className="h-12 w-12 rounded-2xl bg-sky-600" />}
              tailwindClass="rounded-2xl"
              value="1rem (16px)"
            />
            <TokenCard
              name="Full (pill)"
              preview={<div className="h-12 w-24 rounded-full bg-sky-600" />}
              tailwindClass="rounded-full"
              value="9999px"
            />
          </div>
        </div>

        {/* Shadows */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Shadows</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Shadow tokens are minimal in dark mode to maintain contrast. Defined in <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">globals.css</code>.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <TokenCard
              name="Small"
              preview={<div className="h-16 w-full rounded-lg bg-white shadow-sm dark:bg-slate-900" />}
              cssVariable="--shadow-sm"
              tailwindClass="shadow-sm"
              value="0 1px 2px rgba(0,0,0,0.05)"
            />
            <TokenCard
              name="Medium"
              preview={<div className="h-16 w-full rounded-lg bg-white shadow-md dark:bg-slate-900" />}
              cssVariable="--shadow-md"
              tailwindClass="shadow-md"
              value="0 4px 6px rgba(0,0,0,0.1)"
            />
            <TokenCard
              name="Large"
              preview={<div className="h-16 w-full rounded-lg bg-white shadow-lg dark:bg-slate-900" />}
              cssVariable="--shadow-lg"
              tailwindClass="shadow-lg"
              value="0 10px 15px rgba(0,0,0,0.1)"
            />
          </div>
        </div>

        {/* Spacing Scale */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Spacing Scale</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Common spacing utilities based on Tailwind&apos;s default 0.25rem (4px) scale.
          </p>
          <div className="space-y-3">
            {[
              { class: 'p-2', value: '0.5rem (8px)' },
              { class: 'p-3', value: '0.75rem (12px)' },
              { class: 'p-4', value: '1rem (16px)' },
              { class: 'p-6', value: '1.5rem (24px)' },
              { class: 'p-8', value: '2rem (32px)' },
              { class: 'gap-4', value: '1rem (16px) gap' },
            ].map((item) => (
              <div key={item.class} className="flex items-center gap-4">
                <div className="w-32">
                  <code className="text-xs text-slate-700 dark:text-slate-300">{item.class}</code>
                </div>
                <div className="h-8 bg-sky-600" style={{ width: item.value.split(' ')[0] }} />
                <span className="text-sm text-slate-600 dark:text-slate-400">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </StyleSection>

      {/* Typography Section */}
      <StyleSection
        title="Typography"
        description="Typography scale and text styles using Plus Jakarta Sans."
      >
        <div className="space-y-4">
          <TypographySample
            label="Heading 1"
            className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white"
            text="The quick brown fox jumps over the lazy dog"
            tag="h1"
          />
          <TypographySample
            label="Heading 2"
            className="text-2xl font-semibold text-slate-900 dark:text-white"
            text="The quick brown fox jumps over the lazy dog"
            tag="h2"
          />
          <TypographySample
            label="Heading 3"
            className="text-xl font-semibold text-slate-900 dark:text-white"
            text="The quick brown fox jumps over the lazy dog"
            tag="h3"
          />
          <TypographySample
            label="Heading 4"
            className="text-lg font-semibold text-slate-900 dark:text-white"
            text="The quick brown fox jumps over the lazy dog"
            tag="h4"
          />
          <TypographySample
            label="Body Large"
            className="text-base text-slate-900 dark:text-slate-100"
            text="The quick brown fox jumps over the lazy dog. This is a sample of body text at the large size, suitable for prominent paragraphs and introductory content."
            tag="p"
          />
          <TypographySample
            label="Body Default"
            className="text-sm text-slate-900 dark:text-slate-100"
            text="The quick brown fox jumps over the lazy dog. This is the default body text size used throughout most of the application for regular content and descriptions."
            tag="p"
          />
          <TypographySample
            label="Body Small"
            className="text-xs text-slate-900 dark:text-slate-100"
            text="The quick brown fox jumps over the lazy dog. Small body text for captions and supplementary information."
            tag="p"
          />
          <TypographySample
            label="Label"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
            text="Form Label Text"
            tag="span"
          />
          <TypographySample
            label="Muted Text"
            className="text-sm text-slate-600 dark:text-slate-300"
            text="This is muted text used for secondary information and helper text."
            tag="p"
          />
          <TypographySample
            label="Small Muted"
            className="text-xs text-slate-500 dark:text-slate-400"
            text="Very small muted text for metadata and timestamps."
            tag="p"
          />
          <TypographySample
            label="Code"
            className="font-mono text-sm bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded"
            text="const example = 'code snippet';"
            tag="code"
          />
        </div>
      </StyleSection>

      {/* Buttons Section */}
      <StyleSection
        title="Buttons"
        description="Button variants with different states and sizes."
      >
        <ComponentShowcase
          title="Button Variants"
          description="Primary, secondary, danger, and ghost button styles."
          code={`<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="danger">Danger</Button>
<Button variant="ghost">Ghost</Button>`}
          usage="Use primary for main actions, secondary for less prominent actions, danger for destructive operations, and ghost for subtle actions."
        >
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
        </ComponentShowcase>

        <ComponentShowcase
          title="Button Sizes"
          description="Small, medium, and large button sizes."
          code={`<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </ComponentShowcase>

        <ComponentShowcase
          title="Button States"
          description="Disabled and loading states."
          code={`<Button disabled>Disabled</Button>
<Button disabled aria-busy="true">
  <Loader className="animate-spin" /> Loading...
</Button>`}
        >
          <div className="flex flex-wrap gap-3">
            <Button disabled>Disabled</Button>
            <Button disabled={isLoading} onClick={handleLoadingDemo}>
              {isLoading ? 'Loading...' : 'Click to Load'}
            </Button>
          </div>
        </ComponentShowcase>

        <ComponentShowcase
          title="Dark Mode Preview"
          description="All button variants in dark mode."
        >
          <div className="dark rounded-lg bg-slate-950 p-6">
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="ghost">Ghost</Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>
        </ComponentShowcase>
      </StyleSection>

      {/* Cards & Surfaces Section */}
      <StyleSection
        title="Cards & Surfaces"
        description="Card components with different elevations and states."
      >
        <ComponentShowcase
          title="Standard Card"
          description="Default card with border, padding, and subtle shadow."
          code={`<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content goes here.
  </CardContent>
</Card>`}
          usage="Use for grouping related content. Default padding is p-6, border radius is rounded-xl, shadow is shadow-sm."
        >
          <Card>
            <CardHeader>
              <CardTitle>Standard Card</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                This is a standard card with default styling. It includes a subtle shadow and rounded corners.
              </p>
            </CardContent>
          </Card>
        </ComponentShowcase>

        <ComponentShowcase
          title="Elevated Card"
          description="Card with larger shadow for emphasis."
          code={`<Card className="shadow-lg">
  <CardContent>Elevated content</CardContent>
</Card>`}
        >
          <Card className="shadow-lg">
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                This card uses shadow-lg for more prominence. Use for modals or focused content.
              </p>
            </CardContent>
          </Card>
        </ComponentShowcase>

        <ComponentShowcase
          title="Interactive Card"
          description="Card with hover effects for clickable content."
          code={`<Card className="cursor-pointer transition hover:shadow-md hover:-translate-y-0.5">
  <CardContent>Hover me</CardContent>
</Card>`}
        >
          <Card className="cursor-pointer transition hover:shadow-md hover:-translate-y-0.5">
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Hover over this card to see the interactive effect. Use for clickable cards.
              </p>
            </CardContent>
          </Card>
        </ComponentShowcase>
      </StyleSection>

      {/* Inputs & Form Elements Section */}
      <StyleSection
        title="Inputs & Form Elements"
        description="Form controls with different states."
      >
        <ComponentShowcase
          title="Text Input"
          description="Standard text input with label."
          code={`<Input 
  label="Email Address" 
  placeholder="you@example.com" 
  required 
/>`}
        >
          <div className="max-w-md space-y-4">
            <Input label="Email Address" placeholder="you@example.com" required />
            <Input label="With Error" placeholder="Invalid input" error="This field is required" />
          </div>
        </ComponentShowcase>

        <ComponentShowcase
          title="Search Input"
          description="Input with search icon."
          code={`<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2" />
  <Input className="pl-10" placeholder="Search..." />
</div>`}
        >
          <div className="max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-10" placeholder="Search items..." />
            </div>
          </div>
        </ComponentShowcase>

        <ComponentShowcase
          title="Select"
          description="Standard select dropdown."
          code={`<select className="w-full rounded-lg border ...">
  <option>Option 1</option>
</select>`}
        >
          <div className="max-w-md">
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Select Option
            </label>
            <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
              <option>Option 1</option>
              <option>Option 2</option>
              <option>Option 3</option>
            </select>
          </div>
        </ComponentShowcase>

        <ComponentShowcase
          title="Checkbox & Toggle"
          description="Checkbox and toggle switch controls."
          code={`<input type="checkbox" className="accent-sky-600" />
<input type="checkbox" role="switch" className="..." />`}
        >
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-sky-600 accent-sky-600 focus:ring-2 focus:ring-sky-500 dark:border-slate-700"
              />
              <span className="text-sm text-slate-700 dark:text-slate-200">Checkbox option</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                role="switch"
                className="h-5 w-9 appearance-none rounded-full bg-slate-300 transition checked:bg-sky-600 focus:ring-2 focus:ring-sky-500 dark:bg-slate-700"
              />
              <span className="text-sm text-slate-700 dark:text-slate-200">Toggle switch</span>
            </label>
          </div>
        </ComponentShowcase>

        <ComponentShowcase
          title="Textarea"
          description="Multi-line text input."
          code={`<textarea className="w-full rounded-lg border ..." rows={4} />`}
        >
          <div className="max-w-md">
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Description
            </label>
            <textarea
              rows={4}
              placeholder="Enter description..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
        </ComponentShowcase>
      </StyleSection>

      {/* Component Library Section */}
      <StyleSection
        title="Component Library"
        description="Reusable components used throughout Remcura."
      >
        <ComponentShowcase
          title="PageHeader"
          description="Standard page header with title, subtitle, and actions."
          code={`<PageHeader
  title="Inventory"
  subtitle="Track stock levels per location"
  meta="Overview"
  primaryAction={<Button>Create Order</Button>}
  secondaryAction={<Button variant="secondary">Export</Button>}
/>`}
          usage="Use PageHeader at the top of every page for consistent layout. Supports optional meta text, breadcrumbs, and action buttons."
        >
          <PageHeader
            title="Inventory Management"
            subtitle="Track stock levels per location and manage inventory adjustments."
            meta="Overview"
            primaryAction={<Button variant="primary">Create Order</Button>}
            secondaryAction={<Button variant="secondary">Export</Button>}
          />
        </ComponentShowcase>

        <ComponentShowcase
          title="Badge & StatusBadge"
          description="Badges for labels and status indicators."
          code={`<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<StatusBadge status="received" />
<StatusBadge status="draft" />`}
          usage="Use Badge for general labels. Use StatusBadge with predefined status values (draft, sent, received, cancelled, in-progress, completed, pending) for consistent status display."
        >
          <div className="flex flex-wrap gap-3">
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="neutral">Neutral</Badge>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <StatusBadge status="draft" />
            <StatusBadge status="sent" />
            <StatusBadge status="received" />
            <StatusBadge status="cancelled" />
            <StatusBadge status="in-progress" />
            <StatusBadge status="completed" />
          </div>
        </ComponentShowcase>

        <ComponentShowcase
          title="Tabs"
          description="Tabbed navigation for content sections."
          code={`<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="activity">Activity</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">Content</TabsContent>
</Tabs>`}
          usage="Use Tabs for organizing related content into separate views. State is managed internally."
        >
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Overview content goes here. This is the first tab.
              </p>
            </TabsContent>
            <TabsContent value="activity">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Activity content goes here. This is the second tab.
              </p>
            </TabsContent>
            <TabsContent value="settings">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Settings content goes here. This is the third tab.
              </p>
            </TabsContent>
          </Tabs>
        </ComponentShowcase>

        <ComponentShowcase
          title="DataTable"
          description="Responsive table component with hover states."
          code={`const columns = [
  { key: 'sku', label: 'SKU' },
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
];
<DataTable columns={columns} rows={data} />`}
          usage="Use DataTable for displaying tabular data. Supports custom render functions for complex cells. Wraps in overflow-x-auto for responsive behavior."
        >
          <DataTable
            columns={[
              { key: 'sku', label: 'SKU' },
              { key: 'name', label: 'Product Name' },
              { 
                key: 'status', 
                label: 'Status',
                render: (row) => <StatusBadge status={row.status as any} />
              },
              { key: 'qty', label: 'Quantity' },
            ]}
            rows={[
              { sku: 'MED-001', name: 'Surgical Gloves', status: 'received', qty: '500' },
              { sku: 'MED-002', name: 'Face Masks', status: 'in-progress', qty: '1,200' },
              { sku: 'MED-003', name: 'Hand Sanitizer', status: 'draft', qty: '75' },
            ]}
          />
        </ComponentShowcase>

        <ComponentShowcase
          title="DropdownMenu"
          description="Accessible dropdown menu with keyboard navigation."
          code={`<DropdownMenu>
  <DropdownMenuTrigger>
    <Button>Actions</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={...}>Edit</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={...}>Delete</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`}
          usage="Use DropdownMenu for action menus. Supports keyboard navigation (Escape to close) and click-outside detection."
        >
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="secondary">Actions</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => addToast('info', 'Edit clicked')}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addToast('info', 'Duplicate clicked')}>
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => addToast('error', 'Delete clicked')}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ComponentShowcase>

        <ComponentShowcase
          title="Sidebar Link"
          description="Navigation link styles from the sidebar."
          code={`<Link className="flex items-center gap-3 rounded-lg px-3 py-2.5 
  bg-sidebar-active-bg text-sidebar-active-text border-l-2 border-sidebar-active-border">
  <Icon /> Label
</Link>`}
          usage="Sidebar links use specific color tokens for active/inactive states. Active links have a left border and distinct background."
        >
          <div className="space-y-2 rounded-lg border border-border bg-sidebar p-4">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-text hover:bg-sidebar-hover">
              <Package className="h-5 w-5" />
              <span>Inventory (Default)</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border-l-2 border-sidebar-active-border bg-sidebar-active-bg px-3 py-2.5 text-sm font-medium text-sidebar-active-text">
              <Package className="h-5 w-5" />
              <span>Orders (Active)</span>
            </div>
          </div>
        </ComponentShowcase>

        <ComponentShowcase
          title="Toast Notification"
          description="Toast notifications for user feedback."
          code={`const { addToast } = useToastContext();
addToast('success', 'Operation successful');
addToast('error', 'An error occurred');`}
          usage="Use addToast from useToastContext hook to show temporary notifications. Types: success, error, info."
        >
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => addToast('success', 'Success! Operation completed.')}>
              Show Success
            </Button>
            <Button onClick={() => addToast('error', 'Error! Something went wrong.')} variant="danger">
              Show Error
            </Button>
            <Button onClick={() => addToast('info', 'Info: Here is some information.')} variant="secondary">
              Show Info
            </Button>
          </div>
        </ComponentShowcase>
      </StyleSection>

      {/* Accessibility Section */}
      <StyleSection
        title="Accessibility"
        description="Guidelines for accessible design and implementation."
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Color Contrast</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              All text and interactive elements meet WCAG 2.1 AA standards for color contrast. Key combinations:
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">Brand on White</span>
                  <Badge variant="success">AA Pass</Badge>
                </div>
                <div className="flex h-16 items-center justify-center rounded bg-white">
                  <span className="font-semibold text-sky-600">Sample Text</span>
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  Contrast ratio: 4.5:1 (AA compliant)
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">Text on Background</span>
                  <Badge variant="success">AAA Pass</Badge>
                </div>
                <div className="flex h-16 items-center justify-center rounded bg-white dark:bg-slate-950">
                  <span className="font-semibold text-slate-900 dark:text-white">Sample Text</span>
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  Contrast ratio: 16:1 (AAA compliant)
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Click Target Sizes</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              All interactive elements should have a minimum touch target size of 44x44px for accessibility.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="text-center">
                <Button size="sm">Small (36px)</Button>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Below minimum</p>
              </div>
              <div className="text-center">
                <Button size="md">Medium (48px)</Button>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">✓ Recommended</p>
              </div>
              <div className="text-center">
                <Button size="lg">Large (52px)</Button>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">✓ Optimal</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Focus Styles</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              All interactive elements have visible focus indicators using <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">focus:ring-2</code> utilities.
            </p>
            <div className="space-y-3 rounded-lg border border-border bg-card p-4">
              <Button className="focus:ring-2 focus:ring-sky-500 focus:ring-offset-2">
                Button with Focus Ring
              </Button>
              <Input placeholder="Input with focus ring" />
              <a
                href="#"
                className="inline-block text-sm text-sky-600 underline focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:text-sky-400"
              >
                Link with Focus Ring
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Keyboard Navigation</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              All interactive elements are keyboard accessible. Use Tab to navigate forward, Shift+Tab to navigate backward, 
              Enter/Space to activate buttons, and Escape to close modals/dropdowns.
            </p>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                Try navigating with your keyboard:
              </p>
              <div className="flex flex-wrap gap-3">
                <Button>First Button</Button>
                <Button variant="secondary">Second Button</Button>
                <Input placeholder="Text input" className="max-w-xs" />
                <a
                  href="#"
                  className="inline-flex items-center gap-1 text-sm text-sky-600 hover:underline dark:text-sky-400"
                >
                  Link <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </StyleSection>

      {/* Footer */}
      <div className="border-t border-border pt-8 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Remcura Style Guide • Last updated: {new Date().toLocaleDateString()} • 
          <a href="/dashboard" className="ml-1 text-sky-600 hover:underline dark:text-sky-400">
            Back to Dashboard
          </a>
        </p>
      </div>
    </div>
  );
}

