import parentConfig from '../../eslint.config.mjs';

export default [
    ...parentConfig,
    {
        rules: {
            'no-console': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
        },
    },
];
