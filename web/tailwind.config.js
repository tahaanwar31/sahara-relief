/** Calm palette, large type, logical (RTL-safe) spacing. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  safelist: ['btn-primary', 'btn-secondary', 'btn-success', 'btn-danger', 'btn-danger-outline', 'btn-ghost'],
  theme: {
    extend: {
      colors: {
        paper: '#F8F4EF',
        line: '#EAE2D9',
        ink: '#2B2420',
        muted: '#7B6F66',
        brand: { DEFAULT: '#E2693B', dark: '#C9552A', soft: '#FBE8DE', deep: '#2B2420' },
        auto: { DEFAULT: '#2F7D5B', soft: '#E1F0E8' },
        ask: { DEFAULT: '#A8640B', soft: '#FBEBD0' },
        human: { DEFAULT: '#3B63B8', soft: '#E6ECF8' },
        danger: { DEFAULT: '#C23B3B', soft: '#F9E5E3' },
        sand: '#F1E7DB', clay: '#F6DDD0',
      },
      fontFamily: {
        sans: ['"Inter Variable"', '"Segoe UI"', 'system-ui', '-apple-system', 'Roboto', 'Arial', 'sans-serif'],
        urdu: ['"Noto Naskh Arabic"', '"Segoe UI"', 'Tahoma', 'serif'],
      },
      borderRadius: { card: '22px' },
      boxShadow: { card: '0 1px 2px rgba(43,36,32,.04), 0 8px 26px -12px rgba(43,36,32,.14)', lift: '0 8px 18px -8px rgba(226,105,59,.6)', pop: '0 10px 36px -10px rgba(43,36,32,.30)' },
    },
  },
  plugins: [],
}
