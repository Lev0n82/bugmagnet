const babelParser = require('@babel/eslint-parser');
const globals = require('globals');

module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jasmine
      },
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
            presets: ["@babel/preset-env"]
        }
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
    }
  }
];
