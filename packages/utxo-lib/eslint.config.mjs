import parentConfig from '../../eslint.config.mjs';

export default [
    ...parentConfig,
    {
        rules: {
            'no-bitwise': 'off', // airbnb-base: used in hardending
            'prefer-object-spread': 'off', // prefer Object.assign
            'no-underscore-dangle': 'off', // underscore is used
            'no-console': 'warn',
            '@typescript-eslint/no-unused-vars': 'off',
        },
    },
];
