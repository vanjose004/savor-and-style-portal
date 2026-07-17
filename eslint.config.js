import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // This app fetches data in useEffect with a `loading` state set
      // synchronously at the start of the fetch — the standard pattern for
      // a non-Suspense, non-React-Compiler codebase.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Vercel Serverless Functions (Node runtime, not the browser) — the
    // Telegram bot backend. No React here, so none of the React-specific
    // plugins above apply.
    files: ['api/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
])
