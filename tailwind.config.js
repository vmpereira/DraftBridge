/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7fa',
          100: '#eaedf3',
          500: '#4f46e5',
          600: '#4338ca',
          900: '#1e1b4b',
        }
      }
    },
  },
  plugins: [],
};
