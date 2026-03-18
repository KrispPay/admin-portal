import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0f0f11',
        surface: '#1a1a24',
        card: '#1e1e2e',
        border: '#2a2a3e',
        accent: '#6366f1',
        'accent-hover': '#818cf8',
        muted: '#6b7280',
        danger: '#ef4444',
        success: '#22c55e',
        warning: '#f59e0b',
      },
    },
  },
  plugins: [],
}

export default config
