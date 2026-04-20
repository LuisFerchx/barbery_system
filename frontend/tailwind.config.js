/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf8f0',
          100: '#faefd9',
          200: '#f4d9a0',
          300: '#ecbe5f',
          400: '#e4a225',
          500: '#c8860e',
          600: '#a3690a',
          700: '#7d4f0a',
          800: '#5f3c10',
          900: '#4a3012',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
