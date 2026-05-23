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
          900: "#0a0a0a", // Matte deepest black
          800: "#1a1a1a", // Pure matte surface
          700: "#262626", // Secondary dark surface
          600: "#3e3e3e", // Split line / highlight borders
        },
        graphite: {
          500: "#8a8a8a", // Neutral warm grey
          400: "#b3b3b3", // Warm body text
          300: "#eff1f6", // High contrast white
          200: "#eff1f6", // Off-white
          100: "#ffffff", // Light text
        },
        amber: {
          500: "#ffa116", // LeetCode warning/medium accent
          600: "#cc7f0a",
        },
        emerald: {
          500: "#2db55d", // LeetCode Green accent
          600: "#1a9f56",
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
