import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f3ff',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
        coral: {
          400: '#ff9999',
          500: '#ff7b7b',
        },
        cyan: {
          400: '#5dccf7',
          500: '#3ab7ff',
        },
        mint: {
          400: '#66e6a3',
          500: '#4dd98f',
        }
      },
    },
  },
  plugins: [],
};

export default config;