import { eslint } from '@trezor/eslint';

export default [
    ...eslint,
    {
        rules: {
            'no-console': 'warn',
            'import/no-extraneous-dependencies': [
                'error',
                {
                    // Globally we have a list of whitelisted devDependencies. But this is the library
                    // published in npm, so we don't want to allow ANY devDependencies.
                    devDependencies: true,
                },
            ],
        },
    },
];
