import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#f1f4f9",
          100: "#e1e7f1",
          200: "#c3cfe2",
          300: "#94a8c8",
          400: "#6580ad",
          500: "#44608f",
          600: "#2f4772",
          700: "#243759",
          800: "#1b2a4a",
          900: "#131f38",
        },
        bronze: {
          50: "#faf6ef",
          100: "#f2e8d5",
          200: "#e4d0aa",
          300: "#d2b27c",
          400: "#c19a5c",
          500: "#b08d57",
          600: "#957244",
          700: "#765737",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
