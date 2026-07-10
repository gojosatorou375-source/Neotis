import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          light: "var(--bg)",
          dark: "var(--bg)",
        },
        card: {
          light: "var(--card)",
          dark: "var(--card)",
        },
        border: {
          light: "var(--border)",
          dark: "var(--border)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          "primary-dark": "var(--text-primary)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          dark: "var(--accent)",
        },
        success: "var(--success)",
      },
      fontFamily: {
        sans: [
          "SF Pro Display",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      fontSize: {
        hero: ["64px", { lineHeight: "1.1", fontWeight: "700" }],
        section: ["32px", { lineHeight: "1.25", fontWeight: "600" }],
        question: ["40px", { lineHeight: "1.2", fontWeight: "600" }],
        body: ["18px", { lineHeight: "1.6" }],
        small: ["15px", { lineHeight: "1.5" }],
      },
      borderRadius: {
        xl2: "20px",
        xl3: "24px",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0, 0, 0, 0.06)",
        "glass-dark": "0 8px 32px rgba(0, 0, 0, 0.4)",
        floating: "0 20px 60px rgba(0, 0, 0, 0.08)",
      },
      backdropBlur: {
        glass: "24px",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
