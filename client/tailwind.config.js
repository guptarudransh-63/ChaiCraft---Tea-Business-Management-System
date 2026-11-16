/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tea: {
          50: '#f4f8f4',
          100: '#e5f0e5',
          200: '#cce2cc',
          300: '#a3cca3',
          400: '#73b073',
          500: '#4e934e',
          600: '#3c773c',
          700: '#315e31',
          800: '#2a4c2a',
          900: '#243f24',
          950: '#0f220f',
        },
        amber: {
          850: '#78350f',
        }
      },
    },
  },
  plugins: [],
}
