import { eslint } from '@trezor/eslint';

export default [
    ...eslint,
    {
        rules: {
            'jest/valid-expect': 'off', // because of cypress tests
            'import/order': 'off', // Todo: fix and solve
            'no-console': 'off', // It's used in cypress tests
        },
    },
];
