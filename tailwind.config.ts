import type { Config } from 'tailwindcss';

/**
 * Colour tokens are chosen to meet WCAG 2.1 AA contrast against their intended
 * backgrounds (>= 4.5:1 for body text, >= 3:1 for large text and UI components).
 * `brand` 700+ on white and white on `brand` 700+ both pass AA.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4fb',
          100: '#d5e3f5',
          200: '#aec8ea',
          300: '#7fa7dd',
          400: '#5185cd',
          500: '#3268b4',
          600: '#26528f', // AA on white for large text
          700: '#1f4577', // AA on white for body text (>= 4.5:1)
          800: '#1a3a63',
          900: '#152f50',
        },
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
};

export default config;
