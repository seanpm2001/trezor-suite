import parentConfig from '../../eslint.config.mjs';

export default [
    ...parentConfig,
    {
        rules: {
            'no-nested-ternary': 'off', // useful in tests...
            'no-console': 'off',
        },
    },
];
