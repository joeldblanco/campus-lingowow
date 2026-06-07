import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // `primary` is owned by the `@theme inline` block in globals.css
        // (`--color-primary: var(--primary)`), an oklch token that supports
        // alpha variants (bg-primary/10).
        'background-light': '#fafbff', // clean soft white — matches --background
        'background-dark': '#171a2b', // deep indigo — matches .dark --background
        'card-dark': '#1f2438', // matches .dark --card
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
        // Display = Fredoka (rounded, playful). `lexend` kept as a back-compat
        // alias so existing `font-lexend` headings render Fredoka.
        display: ['var(--font-fredoka)', 'sans-serif'],
        lexend: ['var(--font-fredoka)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
