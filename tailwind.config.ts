import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { navy: { 900: "#0a1424", 800: "#0f1d33", 700: "#162844" } } } },
  plugins: [],
};
export default config;
