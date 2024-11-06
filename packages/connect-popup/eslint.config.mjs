import { eslint } from '@trezor/eslint';

export default [
    ...eslint,
    {
        rules: {
            'no-restricted-syntax': 'off', // Todo: fix and solve
        },
    },
];
