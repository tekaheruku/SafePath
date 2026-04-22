const config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                slate: {
                    950: '#020617',
                },
                theme: {
                    bg: {
                        start: 'rgb(var(--theme-bg-start) / <alpha-value>)',
                        end: 'rgb(var(--theme-bg-end) / <alpha-value>)',
                    },
                    fg: {
                        DEFAULT: 'rgb(var(--theme-fg) / <alpha-value>)',
                        muted: 'rgb(var(--theme-fg-muted) / <alpha-value>)',
                    },
                    glass: {
                        bg: 'rgb(var(--theme-glass-bg) / <alpha-value>)',
                        border: 'rgb(var(--theme-glass-border) / <alpha-value>)',
                    },
                    panel: 'rgb(var(--theme-panel-bg) / <alpha-value>)',
                    border: 'rgb(var(--theme-border) / 0.15)',
                    'border-hover': 'rgb(var(--theme-border-hover) / 0.3)',
                    accent: 'rgb(var(--theme-accent) / <alpha-value>)',
                }
            }
        },
    },
    plugins: [],
};
export default config;
