/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm charcoal and muted sage preserve the existing dark interface
        // while lowering saturation. Keep text shades bright enough for WCAG AA.
        slate: {
          50: '#f4f6f2',
          100: '#e8ece6',
          200: '#d7ded7',
          300: '#c3cec4',
          400: '#a2b0a3',
          500: '#9aa79d',
          600: '#98a59b',
          700: '#4a5a4e',
          800: '#2e3b32',
          900: '#202b24',
          950: '#131b16',
        },
        emerald: {
          50: '#eef5f0',
          100: '#dceae0',
          200: '#c4dacb',
          300: '#9fc1aa',
          400: '#7da88a',
          500: '#5b8e6b',
          600: '#467655',
          700: '#365f45',
          800: '#294c36',
          900: '#1f3c2c',
          950: '#13271c',
        },
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
        },
        calm: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          500: '#0ea5e9',
          600: '#0284c7',
        }
      }
    },
  },
  plugins: [],
}
