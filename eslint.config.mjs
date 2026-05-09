// eslint.config.mjs — ESLint 9 flat config for TD POS monorepo
// Uses 'tasks' in turbo.json (not 'pipeline')
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import configPrettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  {
    ignores: [
      'node_modules/**',
      '**/node_modules/**',
      'dist/**',
      '**/dist/**',
      '.turbo/**',
      '**/.turbo/**',
      '.next/**',
      '**/.next/**',
      '.expo/**',
      '**/.expo/**',
      '**/next-env.d.ts',
      'android/**',
      'ios/**',
      'build/**',
      '**/build/**',
      'coverage/**',
      '**/coverage/**',
      // Supabase Edge Functions run on Deno (npm: imports, Deno globals);
      // they are typechecked and linted by Supabase's own toolchain, not ours.
      'supabase/functions/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },

  {
    files: ['**/*.{tsx,jsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: reactHooks.configs.recommended.rules,
  },

  {
    files: ['**/*.config.{js,cjs,mjs}', 'eslint.config.mjs', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        console: 'readonly',
        module: 'readonly',
        process: 'readonly',
        require: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Prettier must be last to override formatting rules
  configPrettier,
]
