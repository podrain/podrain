const colors = require('tailwindcss/colors')

module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        teal: colors.teal,
        orange: colors.orange
      },

      typography: {
        'episode-details': {
          css: {
            color: colors.white,
            a: {
              color: colors.blue[300],
            }
          }
        }
      }
    },
  },
  variants: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography')
  ],
}
