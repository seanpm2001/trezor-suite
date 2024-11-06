import { eslint } from '@trezor/eslint';

export default [
    ...eslint,
    {
        files: ['**/*.stories.tsx'],
        rules: {
            'import/no-default-export': 'off',
        },
    },
];
