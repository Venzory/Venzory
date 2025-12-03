import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'rgb(var(--color-brand-primary) / <alpha-value>)',
          hover: 'rgb(var(--color-brand-primary-hover) / <alpha-value>)',
          light: 'rgb(var(--color-brand-light) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          secondary: 'rgb(var(--color-surface-secondary) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'rgb(var(--color-card-bg) / <alpha-value>)',
          border: 'rgb(var(--color-card-border) / <alpha-value>)',
        },
        sidebar: {
          DEFAULT: 'rgb(var(--color-sidebar-bg) / <alpha-value>)',
          border: 'rgb(var(--color-sidebar-border) / <alpha-value>)',
          text: 'rgb(var(--color-sidebar-text) / <alpha-value>)',
          'text-muted': 'rgb(var(--color-sidebar-text-muted) / <alpha-value>)',
          hover: 'rgb(var(--color-sidebar-hover) / <alpha-value>)',
          'active-bg': 'rgb(var(--color-sidebar-active-bg) / <alpha-value>)',
          'active-text': 'rgb(var(--color-sidebar-active-text) / <alpha-value>)',
          'active-border': 'rgb(var(--color-sidebar-active-border) / <alpha-value>)',
        },
        owner: {
          DEFAULT: 'rgb(var(--color-owner-accent) / <alpha-value>)',
          hover: 'rgb(var(--color-owner-accent-hover) / <alpha-value>)',
          light: 'rgb(var(--color-owner-accent-light) / <alpha-value>)',
          dark: 'rgb(var(--color-owner-accent-dark) / <alpha-value>)',
        },
        admin: {
          DEFAULT: 'rgb(var(--color-admin-accent) / <alpha-value>)',
          hover: 'rgb(var(--color-admin-accent-hover) / <alpha-value>)',
          light: 'rgb(var(--color-admin-accent-light) / <alpha-value>)',
          dark: 'rgb(var(--color-admin-accent-dark) / <alpha-value>)',
        },
        text: {
          DEFAULT: 'rgb(var(--color-text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
          light: 'rgb(var(--color-border-light) / <alpha-value>)',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
      },
    },
  },
  plugins: [],
}
export default config
