import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#06091a',
        surface: '#0b1230',
        surface2: '#0f1a3d',
        fg: '#fafafa',
        muted: '#1a1f3a',
        border: '#1d2a5c',
        brand: {
          DEFAULT: '#2563eb',
          2: '#3b82f6',
          soft: '#93c5fd',
          glow: 'rgba(37,99,235,0.35)'
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif']
      }
    }
  },
  plugins: []
};
export default config;
