import animate from 'tailwindcss-animate';
import plugin from 'tailwindcss/plugin';

/** Semantic colour backed by an RGB-triplet CSS variable (see src/styles/global.css), so `/alpha` works in both themes. */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  darkMode: 'class',
  // Hover fills only for pointers that can hover, so a tap never leaves one stuck on touch screens.
  future: { hoverOnlyWhenSupported: true },
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
    // `sheet` is both a colour and a shadow: without this, shadow-sheet also emits the sheet-coloured
    // shadow-colour utility, which overrides the paper shadow.
    boxShadowColor: ({ theme }) => {
      const { sheet: _, ...colors } = theme('colors');
      return colors;
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
        'brand-lo': token('brand-lo'),
        'brand-ink': token('brand-ink'),
        accent: token('accent'),
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
        // Fixed in both themes: the light box never themes and the note paper is always paper.
        'lightbox-glass': token('lightbox-glass'),
        'note-paper': token('note-paper'),
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
        xs: 'inset 0 1px 0 rgb(var(--glass-edge) / var(--glass-edge-a)), 0 1px 2px rgb(var(--shadow) / var(--shadow-a1))',
        sm: '0 1px 2px rgb(var(--shadow) / var(--shadow-a1)), 0 1px 3px rgb(var(--shadow) / var(--shadow-a2))',
        md: '0 2px 4px -2px rgb(var(--shadow) / var(--shadow-a1)), 0 6px 14px -4px rgb(var(--shadow) / var(--shadow-a2))',
        lg: 'inset 0 1px 0 rgb(var(--glass-edge) / var(--glass-edge-a)), 0 4px 8px -4px rgb(var(--shadow) / var(--shadow-a1)), 0 24px 48px -14px rgb(var(--shadow) / var(--shadow-a3))',
        sheet:
          'inset 0 1px 0 rgb(255 255 255 / var(--paper-edge-a)), 0 1px 1px rgb(var(--shadow) / var(--shadow-a1)), 0 2px 6px -2px rgb(var(--shadow) / var(--shadow-a1)), 0 14px 34px -14px rgb(var(--shadow) / var(--shadow-a3)), 0 40px 90px -50px rgb(var(--paper-glow) / var(--paper-glow-a))',
        // The 1px top edge light alone (chips, banners, the selected row).
        edge: 'inset 0 1px 0 rgb(var(--glass-edge) / var(--glass-edge-a))',
        // Lit navy primaries: white top rim plus a cobalt glow beneath.
        primary: 'inset 0 1px 0 rgb(255 255 255 / 0.16), 0 1px 2px rgb(var(--brand) / 0.3), 0 6px 18px -6px rgb(var(--accent) / 0.45)',
        // Light-box paper: contact shadow, deep drop and a faint cool backlight bleed.
        note: '0 0 0 1px rgb(255 255 255 / 0.08), 0 1px 2px rgb(0 0 0 / 0.6), 0 20px 44px -14px rgb(0 0 0 / 0.85), 0 0 72px -6px rgb(170 195 255 / 0.1)',
      },
      transitionTimingFunction: {
        // Confident arrival (exponential ease-out); quick exits use the stock ease-in.
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        // The pop spring (src/lib/motion.ts) sampled as a CSS linear() curve.
        spring: 'var(--ease-spring)',
      },
      transitionDuration: {
        fast: '120ms',
        base: '180ms',
        slow: '260ms',
        enter: '220ms',
        exit: '150ms',
        panel: '280ms',
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
        indeterminate: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(300%)' },
        },
        'soft-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(0.75)' },
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
      // One-shot entrances fill backwards, so a finished one releases its layer. The keyframes for
      // case-in, swap-in, list-in, pop-in, halo and siren live in global.css, shared with the CSS components.
      animation: {
        'scan-beam': 'scan-beam 2.6s cubic-bezier(0.45, 0, 0.55, 1) infinite',
        develop: 'develop 560ms cubic-bezier(0.16, 1, 0.3, 1) backwards',
        indeterminate: 'indeterminate 1.5s cubic-bezier(0.45, 0, 0.55, 1) infinite',
        'soft-pulse': 'soft-pulse 1.6s ease-in-out infinite',
        float: 'float 1.8s cubic-bezier(0.45, 0, 0.55, 1) infinite',
        'rule-draw': 'rule-draw 640ms cubic-bezier(0.16, 1, 0.3, 1) backwards',
        'case-in': 'case-in 260ms cubic-bezier(0.16, 1, 0.3, 1) backwards',
        'swap-in': 'swap-in 200ms cubic-bezier(0.16, 1, 0.3, 1) backwards',
        'list-in': 'list-in 220ms cubic-bezier(0.16, 1, 0.3, 1) backwards',
        'pop-in': 'pop-in 320ms var(--ease-spring) backwards',
        halo: 'halo 900ms cubic-bezier(0.16, 1, 0.3, 1)',
        siren: 'siren 320ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [
    animate,
    plugin(({ addVariant, matchUtilities }) => {
      // Arbitrary duration-[…], delay-[…] and ease-[…] match both the core transition utilities and tailwindcss-animate's
      // animation ones, which Tailwind calls ambiguous and silently drops. This wins the tie and sets both, as named values do.
      matchUtilities(
        {
          duration: (value) => ({ transitionDuration: value, animationDuration: value }),
          delay: (value) => ({ transitionDelay: value, animationDelay: value }),
          ease: (value) => ({ transitionTimingFunction: value, animationTimingFunction: value }),
        },
        { values: {}, type: [['any', { preferOnConflict: true }]] },
      );
      // The report sheet lays itself out by its own width (it lives in a resizable pane), not the viewport's.
      // 32rem: the 4-column table and run-in finding rows hold from a ~1280px workstation up.
      addVariant('wide', '@container sheet (min-width: 32rem)');
      addVariant('roomy-sheet', '@container sheet (min-width: 42rem)');
      // Chrome inside resizable panes sizes by its container too (declare with [container:pane/inline-size] etc.).
      addVariant('pane-wide', '@container pane (min-width: 36rem)');
      addVariant('bar-wide', '@container bar (min-width: 92rem)');
      addVariant('note-wide', '@container note (min-width: 22rem)');
      addVariant('coarse', '@media (pointer: coarse)');
      // Short desktops (1366×768). A variant, not a raw screen: a raw screen would switch off max-sm:/max-lg:.
      addVariant('short', '@media (max-height: 800px)');
    }),
  ],
};
