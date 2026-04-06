/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef0f7',
          100: '#d5d9ec',
          200: '#aab3d9',
          300: '#7f8dc6',
          400: '#5467b3',
          500: '#2941a0',
          600: '#1e3280',
          700: '#162460',
          800: '#0e1640',
          900: '#1a1c3a',
          950: '#0d0e1d',
        },
        brand: {
          orange: '#f4991a',
          'orange-light': '#f8b44a',
          'orange-dark': '#d4780a',
          navy: '#1a1c3a',
          'navy-light': '#252750',
          'navy-dark': '#0d0e1d',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
