import nextPlugin from "@next/eslint-plugin-next";
import typescriptEslintPlugin from "@typescript-eslint/eslint-plugin";
import typescriptEslintParser from "@typescript-eslint/parser";

export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptEslintParser,
      parserOptions: {
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@next/next': nextPlugin,
      '@typescript-eslint': typescriptEslintPlugin
    },
    rules: {
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }]
    }
  },
  {
    ignores: [
      '.next/',
      'node_modules/',
      'dist/'
    ]
  }
];