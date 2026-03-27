/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        headline: ['Manrope', 'sans-serif'],
      },
      colors: {
        brand: {
          brown:     '#2E1B0C',
          fuchsia:   '#A43E63',
          pink:      '#FBA9E5',
          magnolia:  '#F3EFF1',
        },
        primary: {
          50:  '#fdf2f5',
          100: '#fce4ec',
          200: '#f9c0d1',
          300: '#f490ad',
          400: '#ed5f88',
          500: '#A43E63',
          600: '#85264b',
          700: '#6b1a3c',
          800: '#4f1229',
          900: '#3f001c',
        },
        surface: {
          DEFAULT:   '#fcf8fa',
          low:       '#f6f2f4',
          container: '#f1edef',
          high:      '#ebe7e9',
          highest:   '#e5e1e3',
          white:     '#ffffff',
        },
        on: {
          surface:   '#1c1b1d',
          secondary: '#785d4a',
        },
        outline: {
          DEFAULT: '#877176',
          variant: '#dac0c5',
        },
      },
    },
  },
  plugins: [],
};
