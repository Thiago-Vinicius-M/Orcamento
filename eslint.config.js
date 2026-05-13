import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import prettier from 'eslint-config-prettier'

const deprecatedImportPatterns = [
  {
    group: ['*orcamentoSupabaseRepository*'],
    message:
      'Não importe a fachada `orcamentoSupabaseRepository`: prefira `repositories/orcamento/*`. A fachada existe só para compat pontual.',
  },
]

const supabaseSoftBoundaryForbiddenInPages = {
  group: ['*supabaseClient*'],
  importNames: ['getSupabaseClient', 'requireSupabaseClient'],
  message:
    'Em páginas use `useSupabase()` / `useSupabaseClient()`; `getSupabaseClient` e `requireSupabaseClient` são boundaries fora da árvore React.',
}

const supabaseSoftBoundaryForbiddenInRepos = {
  group: ['*supabaseClient*'],
  importNames: ['getSupabaseClient', 'requireSupabaseClient'],
  message:
    'Em repositórios use `getDefaultSupabase()` nos factories default ou funções `*WithClient(client)`; não use boundaries de sessão.',
}

const restrictedImportsBase = ['error', { patterns: deprecatedImportPatterns }]

const restrictedImportsPages = [
  'error',
  { patterns: [...deprecatedImportPatterns, supabaseSoftBoundaryForbiddenInPages] },
]

const restrictedImportsRepositories = [
  'error',
  { patterns: [...deprecatedImportPatterns, supabaseSoftBoundaryForbiddenInRepos] },
]

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'no-restricted-imports': restrictedImportsBase,
    },
  },
  {
    files: ['src/pages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImportsPages,
    },
  },
  {
    files: ['src/repositories/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImportsRepositories,
    },
  },
  {
    files: [
      'tests/**/*.{ts,tsx}',
      'src/**/*.test.{ts,tsx}',
      'src/**/*.spec.{ts,tsx}',
      'e2e/**/*.{ts,tsx}',
      'scripts/**/*.{ts,tsx}',
      'vitest.setup.ts',
      'supabase/functions/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  prettier,
])
