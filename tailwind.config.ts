import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1C1C1E",
        paper: "#FAFAF8",
        stone: {
          50: "#FAFAF9", 100: "#F2F1EF", 200: "#E5E3DF", 300: "#D3D0C9",
          400: "#A9A59C", 500: "#827E73", 600: "#615D53", 700: "#48453D",
          800: "#302E29", 900: "#1C1C1E",
        },
        moss: {
          50: "#F1F4EE", 100: "#DFE6D8", 300: "#A9BC96", 500: "#5C7A46",
          600: "#4A6338", 700: "#3A4E2C",
        },
        clay: {
          50: "#FBF1EC", 100: "#F4DBCC", 300: "#E1A87F", 500: "#C1703C", 600: "#A85A2C",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
      borderRadius: { xl2: "1.25rem" },
    },
  },
  plugins: [],
};
export default config;
