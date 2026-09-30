/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        institutional: {
          navy: '#0F2C59',
          cobalt: '#2563EB',
          dark: '#0F172A',
          muted: '#475569',
          card: '#F8FAFC',
          border: '#CBD5E1',
          alert: {
            bg: '#FEF2F2',
            border: '#DC2626',
            text: '#991B1B'
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'Calibri', 'Arial', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
};
