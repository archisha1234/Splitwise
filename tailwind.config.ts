import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#09111f",
          900: "#111827",
          800: "#1f2937"
        },
        sun: {
          50: "#fffaf0",
          100: "#fef3c7",
          500: "#f59e0b",
          600: "#d97706"
        }
      },
      boxShadow: {
        soft: "0 10px 30px rgba(17, 24, 39, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
