/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0d1117',
          1: '#161b22',
          2: '#21262d',
          3: '#2d333b',
        },
        border: '#30363d',
        accent: {
          DEFAULT: '#2ea043',
          hover: '#3fb950',
          dim: '#238636',
        },
        link: {
          DEFAULT: '#58a6ff',
          hover: '#79c0ff',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Noto Sans', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
