import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx,mdx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        guavine: ['var(--font-guavine)', 'serif'],
        sans: ['var(--font-raela)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        'geist-mono': ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        background: '#030712',
        foreground: '#f8fafc',
      },
    },
  },
  plugins: [],
};

export default config;
