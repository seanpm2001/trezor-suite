import parentConfig from '../../../eslint.config.mjs';

export default [
    ...parentConfig,
    {
        ignores: ['**/vendor*/'],
    },
    {
        rules: {
            'no-underscore-dangle': 'off',
            camelcase: 'off',
        },
    },
];
