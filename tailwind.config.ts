import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f6f6f4",
          100: "#e8e7e1",
          600: "#5b6e4f",
          700: "#47583d",
        },
      },
    },
  },
  plugins: [],
};

export default config;
