/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wellcare: {
          // 60-30-10 Color Hierarchy
          bg: '#081F1C',           // 60% - Deep pine/dark forest green (background)
          surface: '#123530',      // 30% - Slightly elevated dark green (cards & containers)
          accent: '#2DD4BF',       // 10% - Bright cyan/teal (accents, active states)
          accentDark: '#14B8A6',   // Alternative accent
          
          // Legacy colors for backward compatibility
          primary: '#046a38',
          dark: '#064e3b',
          deep: '#022c22',
          light: '#ecfdf5',
        },
      },
      backdropBlur: {
        glass: '16px',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(13, 59, 47, 0.12)',
        'glass-lg': '0 16px 48px rgba(13, 59, 47, 0.18)',
        'glass-sm': '0 4px 16px rgba(13, 59, 47, 0.08)',
      },
      backgroundImage: {
        'emerald-glass': 'linear-gradient(135deg, rgba(236,253,245,0.7), rgba(16,185,129,0.15))',
        'emerald-deep': 'linear-gradient(135deg, #064e3b 0%, #046a38 60%, #10b981 100%)',
        'dark-gradient': 'linear-gradient(135deg, #0D3B36 0%, #0A2E2A 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
