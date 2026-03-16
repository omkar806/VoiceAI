/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f7ff',
          100: '#e0f0ff',
          200: '#c0e0ff',
          300: '#80c0ff',
          400: '#4090ff',
          500: '#1060ff',
          600: '#0040f0',
          700: '#0030d0',
          800: '#0020b0',
          900: '#001090',
          950: '#000870',
        },
        neutral: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      borderRadius: {
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        'soft': '0 2px 15px rgba(0, 0, 0, 0.06)',
        'medium': '0 4px 20px rgba(0, 0, 0, 0.08)',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-soft': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounce 2s infinite',
        'dropdown-enter': 'dropdownEnter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'dropdown-exit': 'dropdownExit 0.3s cubic-bezier(0.4, 0, 1, 1)',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        dropdownEnter: {
          '0%': { 
            opacity: '0', 
            transform: 'scale(0.95) translateY(-8px)',
          },
          '100%': { 
            opacity: '1', 
            transform: 'scale(1) translateY(0)',
          },
        },
        dropdownExit: {
          '0%': { 
            opacity: '1', 
            transform: 'scale(1) translateY(0)',
          },
          '100%': { 
            opacity: '0', 
            transform: 'scale(0.95) translateY(-8px)',
          },
        },
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
} 