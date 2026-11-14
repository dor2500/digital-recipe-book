import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: "#f6efe1", dark: "#ebe0c9", edge: "#d9c9a6" },
        ink: { DEFAULT: "#2b211a", soft: "#5c4a3b", faint: "#8a7660" },
        leather: { DEFAULT: "#5a1f1b", dark: "#3b1210", light: "#7a2c25" },
        gilt: "#c9a253",
        tab: {
          breakfast: "#d9a441",
          mains: "#a8432f",
          vegan: "#5d7d43",
          sides: "#3f7f7a",
          breads: "#9a6a3a",
          baking: "#4f6d9a",
          desserts: "#b7577a",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        hand: ["var(--font-hand)", "cursive"],
      },
      boxShadow: {
        book: "0 30px 60px -12px rgba(0,0,0,.55), 0 18px 36px -18px rgba(0,0,0,.6)",
        card: "0 1px 0 rgba(255,255,255,.6) inset, 0 20px 40px -10px rgba(0,0,0,.45)",
      },
    },
  },
  plugins: [],
};

export default config;
