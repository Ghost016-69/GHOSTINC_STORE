/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Monochrome foundation: pure ink, paper, and a tonal scale.
        ink: {
          DEFAULT: '#070707',
          50: '#0a0a0a',
          100: '#0e0e0e',
          200: '#161616',
          300: '#1f1f1f',
          400: '#2a2a2a',
          500: '#353535',
          600: '#4a4a4a',
          700: '#6b6b6b',
          800: '#9a9a9a',
          900: '#d4d4d4',
        },
        paper: {
          DEFAULT: '#ffffff',
          soft: '#f5f5f5',
          muted: '#e8e8e8',
        },
        ghost: {
          bg: '#070707',
          surface: '#0e0e0e',
          'surface-soft': '#161616',
          text: '#f7f7f7',
          'text-soft': '#a3a3a3',
          border: '#262626',
        },
        // The logo carries the only colour in the product — keep it as a
        // restrained accent so the monochrome shell frames it rather than
        // competes with it.
        brand: {
          DEFAULT: '#22d3ee',
          strong: '#67e8f9',
          on: '#04222b',
        },
        accent: '#8b5cf6',
        sale: '#f472b6',
      },
      fontFamily: {
        sans: ['"Inter"', '"Segoe UI"', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Cascadia Mono', 'Consolas', 'Courier New', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.45)',
        glow: '0 0 0 1px rgba(255,255,255,0.06), 0 18px 50px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'grid': 'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '40px 40px',
      },
    },
  },
  plugins: [],
}