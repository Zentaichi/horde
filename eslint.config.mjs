import boundaries from 'eslint-plugin-boundaries';
import vueParser from 'vue-eslint-parser';
import tsParser from '@typescript-eslint/parser';

const boundarySettings = {
  'boundaries/include': ['src/**'],
  'boundaries/ignore': ['src/**/*.d.ts'],
  'boundaries/elements': [
    { partialMatch: false, type: 'shared', pattern: 'src/shared/**' },
    { partialMatch: false, type: 'features', pattern: 'src/features/**', capture: ['featureName'] },
    { partialMatch: false, type: 'widgets', pattern: 'src/widgets/**' },
    { partialMatch: false, type: 'pages', pattern: 'src/pages/**' },
    { partialMatch: false, type: 'app', pattern: 'src/app/**' },
  ],
};

const boundaryRules = {
  'boundaries/dependencies': [
    'error',
    {
      default: 'disallow',
      policies: [
        { from: [{ type: 'shared' }], allow: [{ type: 'shared' }] },
        { from: [{ type: 'features' }], allow: [{ type: 'shared' }] },
        { from: [{ type: 'widgets' }], allow: [{ type: 'features' }, { type: 'shared' }] },
        { from: [{ type: 'pages' }], allow: [{ type: 'features' }, { type: 'widgets' }, { type: 'shared' }] },
        { from: [{ type: 'app' }], allow: [{ type: 'features' }, { type: 'widgets' }, { type: 'pages' }, { type: 'shared' }] },
      ],
    },
  ],
};

export default [
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.d.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: { boundaries },
    settings: boundarySettings,
    rules: boundaryRules,
  },
  {
    files: ['src/**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: { boundaries },
    settings: boundarySettings,
    rules: boundaryRules,
  },
];
