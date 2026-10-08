import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'

/* ESLint 9 (config plana). El formato lo pone Prettier; aquí solo errores reales y reglas de hooks. */
export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      /* Que ESLint vea como usadas las variables que solo aparecen en JSX */
      'react/jsx-uses-vars': 'error',
      /* Componentes usados en JSX sin importar (no-undef no los ve) */
      'react/jsx-no-undef': 'error',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true, allowExportNames: ['useStore', 'useAuth', 'useClase'] },
      ],
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
    },
  },
  /* Migraciones y hooks de PocketBase: corren dentro de PocketBase (JSVM), con sus globales */
  {
    files: ['backend/pb_migrations/**/*.js', 'backend/pb_hooks/**/*.js'],
    languageOptions: {
      globals: {
        migrate: 'readonly',
        Collection: 'readonly',
        SelectField: 'readonly',
        RelationField: 'readonly',
        TextField: 'readonly',
        Record: 'readonly',
        $app: 'readonly',
        onRecordAfterCreateSuccess: 'readonly',
        onRecordValidate: 'readonly',
        BadRequestError: 'readonly',
        ValidationError: 'readonly',
      },
    },
  },
  /* Tests del backend y configuración: Node */
  { files: ['backend/tests/**/*.js', 'backend/scripts/**/*.mjs', '*.config.js'], languageOptions: { globals: globals.node } },
  prettier,
]
