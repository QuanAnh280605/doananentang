/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#F8FAFC',
          surface: '#FFFFFF',
          muted: '#F1F5F9',
          text: '#0F172A',
          subtext: '#64748B',
          border: '#E4E8EE',
          accent: '#4A9FD8',
          'accent-hover': '#2F8BC9',
          'accent-soft': '#EAF4FB',
        },
      },
      borderRadius: {
        card: '32px',
        surface: '24px',
        control: '18px',
        avatar: '14px',
      },
    },
  },
  plugins: [],
};
