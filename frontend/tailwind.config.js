/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#FAFAFA',
                foreground: '#0F172A',
                muted: '#F1F5F9',
                'muted-foreground': '#64748B',
                accent: '#0052FF',
                'accent-secondary': '#4D7CFF',
                'accent-foreground': '#FFFFFF',
                border: '#E2E8F0',
                card: '#FFFFFF',
                ring: '#0052FF',
            },
            fontFamily: {
                display: ['Calistoga', 'Georgia', 'serif'],
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            boxShadow: {
                'sm': '0 1px 3px rgba(0,0,0,0.06)',
                'md': '0 4px 6px rgba(0,0,0,0.07)',
                'lg': '0 10px 15px rgba(0,0,0,0.08)',
                'xl': '0 20px 25px rgba(0,0,0,0.1)',
                'accent': '0 4px 14px rgba(0,82,255,0.25)',
                'accent-lg': '0 8px 24px rgba(0,82,255,0.35)',
            },
            animation: {
                'float': 'float 5s ease-in-out infinite',
                'pulse-slow': 'pulse 3s ease-in-out infinite',
                'rotate-slow': 'rotate 60s linear infinite',
                'marquee': 'marquee 30s linear infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                rotate: {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                },
                marquee: {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
            },
        },
    },
    plugins: [],
}
