/** Flat ESLint config */
import globals from "globals";

export default [
  {
    ignores: [
      "**/.venv/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/__pycache__/**",
      "data/storage/**",
      "docs/api/**"   // loosen until API JSON is valid
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      // be lenient for initial import; tighten later
      "no-unused-vars": "warn",
      "no-undef": "error"
    },
  },
];
