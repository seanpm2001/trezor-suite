import { eslint } from '@trezor/eslint';

export default [
    ...eslint,
    {
        rules: {
            '@typescript-eslint/ban-types': 'off', // allow {} in protobuf.d.ts
            '@typescript-eslint/no-shadow': 'off',
        },
    },
];
