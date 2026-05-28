/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sportsbook dark theme
        bg: "#0D1117",
        card: "#161A1F",
        border: "#262C34",
        accent: "#00D26A",
        loss: "#FF4757",
        pending: "#FFB020",
        text: "#F0F3F6",
        muted: "#8B949E",
      },
    },
  },
  plugins: [],
}
