import type { Config } from "tailwindcss";

// D1TechCreative palette — no purple/violet. Use sky as secondary blue.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:       'var(--color-bg)',
        surface:  'var(--color-surface