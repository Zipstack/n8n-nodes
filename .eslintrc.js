module.exports = {
    root: true,
    env: {
        browser: true,
        es6: true,
        node: true,
    },
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
    },
    extends: [
        'eslint:recommended',
    ],
    rules: {
        'no-console': 'off',
        'semi': ['error', 'always'],
        'quotes': ['error', 'single'],
        'indent': ['error', 4],
        'comma-dangle': ['error', 'always-multiline'],
        'no-trailing-spaces': 'error',
        'eol-last': 'error',
        'no-multiple-empty-lines': ['error', { 'max': 1 }],
    },
    ignorePatterns: ['dist/**/*'],
};
