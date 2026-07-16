/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        coral: {
          DEFAULT: "#bf7e5e",
          hover: "#a96b4d",
          light: "#fdf6f2",
          glow: "rgba(191, 126, 94, 0.15)",
        },
        peach: "#d4a48c",
        cream: "#fafaf9",
        "warm-white": "#fefcfa",
        ink: {
          DEFAULT: "#1a1a1a",
          secondary: "#6b6560",
          tertiary: "#a9a29c",
        },
        edge: {
          DEFAULT: "#ede8e3",
          light: "#f5f0eb",
        },
        success: {
          DEFAULT: "#2d9d78",
          bg: "#eefbf5",
        },
        warning: {
          DEFAULT: "#e5a000",
          bg: "#fff8e6",
        },
        error: {
          DEFAULT: "#e54d42",
          bg: "#fef2f2",
        },
      },
      borderRadius: {
        sm: "8px",
        md: "14px",
        lg: "20px",
        xl: "28px",
      },
      fontFamily: {
        display: ['"DM Sans"', '"Noto Sans SC"', "sans-serif"],
        body: ['"DM Sans"', '"Noto Sans SC"', "sans-serif"],
      },
      boxShadow: {
        sm: "0 1px 2px rgba(26,26,26,0.04)",
        md: "0 4px 16px rgba(26,26,26,0.06)",
        lg: "0 12px 40px rgba(26,26,26,0.08)",
        coral: "0 12px 48px rgba(191, 126, 94, 0.25)",
      },
    },
  },
  plugins: [],
};
