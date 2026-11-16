/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: '#16263B',
        'night-surface': '#22344D',
        'night-elevated': '#2A3B52',
        'night-border': '#3A506C',
        'night-muted': '#9FB0C6',
        'night-tab-bar': '#0F1C2D',
        'night-deep': '#0B1420',
        sand: '#F7F1E6',
        dune: '#ECE4D6',
        ink: '#241C14',
        gold: '#F2D9A0',
        rumman: '#B8323A',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', '"Aref Ruqaa"', 'serif'],
        sans: ['"IBM Plex Sans Arabic"', '"Bricolage Grotesque"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
