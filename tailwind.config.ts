import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Interstate', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Match Laravel app color system - violet as primary
        green: colors.emerald,
        'custom-beige': '#F2F2EC',
        'darker-beige': '#E5E5D8',
      },
      zIndex: {
        '60': '60',
        '70': '70',
      },
    },
  },
  plugins: [],
};

export default config;
