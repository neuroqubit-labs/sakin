import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        panel: {
          DEFAULT: 'hsl(var(--panel))',
          foreground: 'hsl(var(--panel-foreground))',
        },
        stone: {
          50: '#fcfaf6',
          100: '#f7f2ea',
          200: '#eadfce',
        },
        navy: {
          950: '#081120',
          900: '#0e1a2f',
          800: '#15233c',
          700: '#20304c',
        },
        sand: '#d8c7b6',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
      },
      boxShadow: {
        halo: '0 18px 60px rgba(8, 17, 32, 0.12)',
        panel: '0 20px 80px rgba(8, 17, 32, 0.14)',
      },
      fontFamily: {
        sans: ['var(--font-manrope)'],
        display: ['var(--font-instrument-serif)'],
      },
      backgroundImage: {
        lattice:
          'linear-gradient(to right, rgba(8, 17, 32, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(8, 17, 32, 0.08) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}

export default config
