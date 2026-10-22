import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        brand: {
          dark: "#0b0c10",
          card: "#12141a",
          cardLight: "#181b24",
          border: "#1f232e",
          gold: "#d97706",
          goldLight: "#f59e0b",
          goldHover: "#b45309",
        },
      },
    },
  },
  plugins: [],
};

export default config;
