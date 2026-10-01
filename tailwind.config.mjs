import animate from 'tailwindcss-animate';
import plugin from 'tailwindcss/plugin';

/** Semantic colour backed by an RGB-triplet CSS variable (see src/styles/global.css), so `/alpha` works in both themes. */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    // Fixed product scale (ratio ~1.15); nothing renders below 12px.
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.8125rem', { lineHeight: '1.125rem' }],
      base: ['0.875rem', { lineHeight: '1.25rem' }],
      md: ['0.9375rem', { lineHeight: '1.4rem' }],
      lg: ['1rem', { lineHeight: '1.5rem' }],
      xl: ['1.125rem', { lineHeight: '1.625rem' }],
      '2xl': ['1.375rem', { lineHeight: '1.875rem' }],
      '3xl': ['1.75rem', { lineHeight: '2.25rem' }],
    },
    extend: {
      colors: {
        canvas: token('canvas'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        'surface-3': token('surface-3'),
        line: token('line'),
        'line-strong': token('line-strong'),
        ink: token('ink'),
        'ink-2': token('ink-2'),
        muted: token('muted'),
        faint: token('faint'),
        brand: token('brand'),
        'brand-ink': token('brand-ink'),
        accent: token('accent'),
        'accent-strong': token('accent-strong'),
        'accent-soft': token('accent-soft'),
        'on-accent': token('on-accent'),
        success: token('success'),
        'success-soft': token('success-soft'),
        warning: token('warning'),
        'warning-soft': token('warning-soft'),
        danger: token('danger'),
        'danger-soft': token('danger-soft'),
        sheet: token('sheet'),
        'sheet-ink': token('sheet-ink'),
        'sheet-line': token('sheet-line'),
        'sheet-tint': token('sheet-tint'),
        lightbox: token('lightbox'),
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        // The printed report's own stack (src/pages/print/[id].astro): the editable sheet uses it so it reads like the PDF.
        document: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        sm: '0.375rem',
        DEFAULT: '0.5rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      boxShadow: {
        xs: '0 1px 2px rgb(var(--shadow) / var(--shadow-a1))',
        sm: '0 1px 2px rgb(var(--shadow) / var(--shadow-a1)), 0 1px 3px rgb(var(--shadow) / var(--shadow-a2))',
        md: '0 2px 4px -2px rgb(var(--shadow) / var(--shadow-a1)), 0 6px 14px -4px rgb(var(--shadow) / var(--shadow-a2))',
        lg: '0 4px 8px -4px rgb(var(--shadow) / var(--shadow-a1)), 0 16px 36px -10px rgb(var(--shadow) / var(--shadow-a3))',
        sheet: '0 1px 1px rgb(var(--shadow) / var(--shadow-a1)), 0 10px 30px -12px rgb(var(--shadow) / var(--shadow-a3))',
      },
      transitionTimingFunction: {
        // Confident arrival (exponential ease-out); quick exits use the stock ease-in.
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
      },
      transitionDuration: {
        fast: '120ms',
        base: '180ms',
        slow: '260ms',
      },
      keyframes: {
        // Signature moment: the AI "reads" the note while the report develops like film.
        // The beam is a third of the note's height: -100% → 300% of itself sweeps the whole page.
        'scan-beam': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '10%, 90%': { opacity: '1' },
          '100%': { transform: 'translateY(300%)', opacity: '0' },
        },
        develop: {
          from: { opacity: '0', filter: 'blur(6px)', transform: 'translateY(4px)' },
          to: { opacity: '1', filter: 'blur(0)', transform: 'translateY(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        indeterminate: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(300%)' },
        },
        'soft-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(0.75)' },
        },
        'check-pop': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '60%': { transform: 'scale(1.12)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        // The printed rules draw themselves when a fresh draft lands.
        'rule-draw': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
      },
      animation: {
        'scan-beam': 'scan-beam 2.6s cubic-bezier(0.45, 0, 0.55, 1) infinite',
        develop: 'develop 560ms cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 1.8s linear infinite',
        indeterminate: 'indeterminate 1.5s cubic-bezier(0.45, 0, 0.55, 1) infinite',
        'soft-pulse': 'soft-pulse 1.6s ease-in-out infinite',
        'check-pop': 'check-pop 420ms cubic-bezier(0.16, 1, 0.3, 1) both',
        float: 'float 1.8s cubic-bezier(0.45, 0, 0.55, 1) infinite',
        'rule-draw': 'rule-draw 640ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [
    animate,
    // The report sheet lays itself out by its own width (it lives in a resizable pane), not the viewport's.
    // 32rem: the 4-column table and run-in finding rows hold from a ~1280px workstation up.
    plugin(({ addVariant }) => addVariant('wide', '@container sheet (min-width: 32rem)')),
  ],
};
