import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: "#006DFF",
        brandHover: "#005BE0",
        brandSoft: "#EEF6FF",
        brandBorder: "#B8D7FF",
        ink: "#0F172A",
        slateText: "#64748B",
        line: "#E2E8F0",
        success: "#10B981",
        error: "#EF4444",
        mint: "#006DFF",
        coral: "#EF4444"
      }
    }
  },
  plugins: []
};

export default config;
