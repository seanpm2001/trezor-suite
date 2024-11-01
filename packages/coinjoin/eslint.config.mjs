import parentConfig from '../../eslint.config.mjs';

export default [
    ...parentConfig,
    {
        rules: {
            'no-bitwise': 'off',
            'no-console': 'warn',
        },
    },
];
