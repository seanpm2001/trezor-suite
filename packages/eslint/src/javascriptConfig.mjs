import pluginJs from '@eslint/js';

export const javascriptConfig = [
    pluginJs.configs.recommended,
    {
        rules: {
            // Offs
            'no-undef': 'off', // Todo: write description

            // Additional rules
            'no-console': ['error', { allow: ['warn', 'error'] }],
            'require-await': ['error'],
        },
    },
    {
        files: ['**/*.js'], // Usually config files
        rules: {
            'no-console': 'off',
        },
    },
];
