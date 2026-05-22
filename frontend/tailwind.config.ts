import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        charcoal: {
          900: "#09090b", // Matte deepest black
          800: "#121212", // Pure matte surface
          700: "#18181b", // Secondary dark surface
          600: "#27272a", // Split line / highlight borders
        },
        graphite: {
          500: "#52525b", // Neutral warm grey
          400: "#71717a", // Warm body text
          300: "#a1a1aa", // Subtitle/secondary text
          200: "#d4d4d8", // Sand off-white
          100: "#f4f4f5", // Light text
        },
        amber: {
          500: "#d97706", // Warns / status yellow / accents
          600: "#b45309",
        },
        emerald: {
          500: "#10b981", // Run status
          600: "#059669",
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
