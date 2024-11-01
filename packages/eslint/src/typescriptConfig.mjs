import tseslint from 'typescript-eslint';

export const typescriptConfig = [
    ...tseslint.configs.recommended,
    {
        rules: {
            // Offs
            '@typescript-eslint/no-require-imports': 'off', // We just use require a lot (mostly for dynamic imports)
            '@typescript-eslint/no-explicit-any': 'off', // Todo: write description
            '@typescript-eslint/ban-ts-comment': 'off', // Todo: just temporary, reconsider to remove it
            '@typescript-eslint/no-empty-object-type': 'off', // Todo: we shall solve this, this is bad practice

            // Additional rules
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    vars: 'all',
                    args: 'none',
                    ignoreRestSiblings: true,
                    varsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-shadow': [
                'off',
                {
                    builtinGlobals: false,
                    allow: ['_', 'error', 'resolve', 'reject', 'fetch'],
                },
            ],
            '@typescript-eslint/no-use-before-define': ['error'],
        },
    },
];
