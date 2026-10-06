/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Mirrors the legacy stylesheet's tokens in
        // Front-end/Style/style.css so both apps look the same.
        ghost: {
          bg: '#0b0f14',
          surface: '#141d27',
          'surface-soft': '#1b2634',
          text: '#e8eef6',
          'text-soft': '#9aa9ba',
          border: '#25323f',
        },
        brand: {
          DEFAULT: '#22d3ee',
          strong: '#7ee7f7',
          on: '#04222b',
        },
        accent: '#8b5cf6',
        sale: '#f472b6',
      },
      fontFamily: {
        sans: ['Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['Cascadia Mono', 'Consolas', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
