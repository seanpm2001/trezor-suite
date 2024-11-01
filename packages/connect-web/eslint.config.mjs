import parentConfig from '../../eslint.config.mjs';

export default [
    ...parentConfig,
    {
        rules: {
            'no-underscore-dangle': 'off', // underscore is used
            camelcase: 'off', // camelcase is used
            'jest/valid-expect': 'off', // because of cypress tests
        },
    },
];
