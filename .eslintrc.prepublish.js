/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
    extends: ['@n8n_io/eslint-config/base'],
    rules: {
        'n8n-local-rules/node-param-description-identical-to-display-name': 'off',
        'n8n-local-rules/node-param-description-line-break': 'off',
        'n8n-local-rules/node-param-description-missing-final-period': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
};
