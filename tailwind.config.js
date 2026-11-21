/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#060911',
          900: '#0B0F19',
          800: '#111827',
          700: '#1E293B',
          600: '#334155'
        },
        charcoal: {
          900: '#121214',
          800: '#1A1A1E',
          700: '#26262B'
        },
        cream: {
          50: '#FAF8F5',
          100: '#F5F2EB',
          200: '#EAE5D9'
        },
        lime: {
          400: '#A3E635',
          500: '#84CC16',
          brand: '#22C55E'
        },
        teal: {
          400: '#2DD4BF',
          500: '#14B8A6'
        },
        amber: {
          500: '#F59E0B',
          600: '#D97706'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      animation: {
        'pulse-subtle': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ripple': 'ripple 1.5s cubic-bezier(0, 0.2, 0.8, 1) infinite',
      },
      keyframes: {
        ripple: {
          '0%': { transform: 'scale(0.95)', opacity: '1' },
          '100%': { transform: 'scale(1.4)', opacity: '0' }
        }
      }
    },
  },
  plugins: [],
}
