module.exports = {
  style: {
    postcss: {
      plugins: [
        require('@tailwindcss/postcss'),
        require('postcss-import'),
        require('autoprefixer'),
      ],
    },
  },
};