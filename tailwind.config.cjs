/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Montserrat', 'sans-serif'],
            },
            colors: {
                // Kroma ブランドカラー
                'accent': '#75509f',
                'accent-orange': '#fe7f2e',
                'accent-purple': '#75509f',
            },
            backgroundImage: {
                'kroma-gradient': 'linear-gradient(90deg, #fe7f2e 0%, #75509f 100%)',
            },
            boxShadow: {
                'glow': '0 0 20px rgba(117, 80, 159, 0.3)',
                'glow-orange': '0 0 20px rgba(254, 127, 46, 0.3)',
            },
        },
    },
    plugins: [],
}
