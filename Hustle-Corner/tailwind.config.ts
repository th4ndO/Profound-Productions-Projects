import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2f7",
          100: "#d6dfea",
          500: "#1e3a5f",
          600: "#14283e",
          700: "#0c1a29",
        },
      },
    },
  },
  plugins: [],
};

export default config;
