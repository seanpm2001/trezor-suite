import parentConfig from '../../eslint.config.mjs';

export default [
    ...parentConfig,
    {
        rules: {
            'no-underscore-dangle': 'off', // underscore is used
        },
    },
];
