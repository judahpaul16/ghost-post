import type { Config } from "tailwindcss";

export default {
  content: ["./src/popup/**/*.{ts,tsx}", "./src/options/**/*.{ts,tsx}", "./src/hn-results/**/*.{ts,tsx}", "./src/headcount/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ghost: {
          green: "#22c55e",
          yellow: "#eab308",
          red: "#ef4444",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
