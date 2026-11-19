/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#F6F9FB',
        ink: '#14303A',
        mute: '#5B7480',
        line: '#DCE7EC',
        teal: {
          DEFAULT: '#0F7C8A',
          dark: '#0B5F6A',
          light: '#12939E',
        },
        tint: {
          DEFAULT: '#DDF1F3',
          light: '#EDF8F9',
        },
        risk: {
          high: '#D9534F',
          highBg: '#FCE9E8',
          med: '#B9791A',
          medBg: '#FFF2DA',
          low: '#23805A',
          lowBg: '#E2F4EC',
        },
      },
      fontFamily: {
        heading: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        body: ['Figtree', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'lg-card': '16px',
        'xl-sheet': '20px',
      },
      keyframes: {
        bob: {
          '0%, 100%': { transform: 'rotate(-45deg) translateY(0)' },
          '50%': { transform: 'rotate(-45deg) translateY(-3px)' },
        },
        pulseRisk: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(217, 83, 79, 0.35)' },
          '50%': { boxShadow: '0 0 0 6px rgba(217, 83, 79, 0)' },
        },
        fadeSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        popModal: {
          '0%': { opacity: '0', transform: 'scale(0.92) translateY(16px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        bob: 'bob 3s ease-in-out infinite',
        pulseRisk: 'pulseRisk 2s ease-in-out infinite',
        fadeSlideUp: 'fadeSlideUp 0.35s ease-out forwards',
        popModal: 'popModal 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
    },
  },
  plugins: [],
}
