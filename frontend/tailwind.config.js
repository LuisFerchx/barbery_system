/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fdf8f0',
          100: '#faefd9',
          200: '#f4d9a0',
          300: '#ecbe5f',
          400: '#E4A225',
          500: '#C8860E',
          600: '#A3690A',
          700: '#7d4f0a',
          800: '#5f3c10',
          900: '#4a3012',
        },
        surface: {
          0:  '#080808',
          1:  '#111111',
          2:  '#1a1a1a',
          3:  '#222222',
          4:  '#2a2a2a',
        },
        dark: {
          text:      '#f0ede8',
          secondary: '#8a8680',
          muted:     '#4a4845',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderColor: {
        dark: 'rgba(255,255,255,0.07)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #C8860E, #E4A225)',
      },
      boxShadow: {
        'gold': '0 0 20px rgba(200, 134, 14, 0.25)',
        'gold-lg': '0 0 40px rgba(200, 134, 14, 0.35)',
        'card': '0 1px 3px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3)',
      },
      animation: {
        'spin-slow': 'spin 20s linear infinite',
        'pulse-gold': 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
      },
    },
  },
  plugins: [],
}
