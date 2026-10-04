import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["dist/", "node_modules/"],
  },

  js.configs.recommended,

  // The pages' modules run in the browser.
  {
    files: ["src/**/*.js"],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // A value left unused is usually a step forgotten. A parameter kept for
      // its position, such as the first of an event handler's, can be named
      // with a leading underscore.
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      eqeqeq: "error",
      "prefer-const": "error",
    },
  },

  // A classic script rather than a module, run before the page is parsed.
  {
    files: ["public/**/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: globals.browser,
    },
  },

  // The configuration files run in Node.
  {
    files: ["*.config.js"],
    languageOptions: {
      globals: globals.node,
    },
  },
];
