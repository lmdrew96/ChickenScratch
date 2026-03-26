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
        fraunces: ['var(--font-fraunces)', 'serif'],
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
