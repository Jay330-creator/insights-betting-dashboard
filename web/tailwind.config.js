/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0b1020",
        panel: "rgba(17,24,39,.75)",
        panel2: "rgba(31,41,55,.65)",
        border: "rgba(255,255,255,.08)",
      },
      boxShadow: {
        glow: "0 18px 50px rgba(0,0,0,.22)",
      }
    },
  },
  plugins: [],
}

