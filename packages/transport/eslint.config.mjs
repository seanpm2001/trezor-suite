import { eslint } from '@trezor/eslint';

export default [
    ...eslint,
    {
        rules: {
            'no-console': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            'import/order': 'off', // Todo: we shall enable this in future PR
        },
    },
];
