import tseslint from '@typescript-eslint/eslint-plugin';

export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'dist/**',
      '.turbo/**',
      '**/*.mjs',
    ],
  },
  ...tseslint.configs['flat/strict-type-checked'],
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parserOptions: { projectService: true } },
  },
];
