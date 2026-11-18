/** @type {import('tailwindcss').Config} */
//
// Palette + type mapped from designs/brand/tokens.json, the canonical token
// source. Do not invent hex values.
//   night #16263B · gold #F2D9A0 · sand #F7F1E6 · dune #ECE4D6 ·
//   ink #241C14 · rumman #B8323A
// The night-* shades below are the derived Night scale used by the Sahra Web
// Prototype's fan surfaces (#22344D card, #2A3B52, #3A506C border, #9FB0C6
// muted, #0B1420 deep), they come from the spec, not from invention.
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
        // Secondary body text on Night, from the prototype's fan surfaces.
        'night-subtle': '#C9D3DF',
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
      borderRadius: {
        // tokens.json radius.cardPx = 12 (cards match the ticket corner)
        card: '12px',
      },
    },
  },
  plugins: [],
};
