/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      // (optional) your custom additions—defaults like slate-900 are always present
      colors: {
        "slate-dark": "#0f172a",
        "cyan-accent": "#22d3ee",
        "green-accent": "#4ade80",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ['"Fira Code"', "monospace"],
      },
    },
  },
  plugins: [
    // any Tailwind plugins you want, e.g. require('@tailwindcss/forms'),
  ],
};