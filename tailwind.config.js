/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  // NOTE: Include root files (App.js) and standard directory paths
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        panda: {
          pink: "#D70F64",
          pinkLight: "#FFF0F5",
          pinkDark: "#B00B50",
          dark: "#1F1F1F",
          gray: "#707070",
          lightGray: "#F7F7F7",
          border: "#E2E8F0",
        },
      },
    },
  },
  plugins: [],
};
