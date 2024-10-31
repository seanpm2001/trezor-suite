import parentConfig from '../../eslint.config.mjs';

export default [
    ...parentConfig,
    {
        ignores: ['**/__snapshots__/**/*'],
    },
    {
        rules: {
            'no-console': 'warn',

            'import/no-extraneous-dependencies': [
                'error',
                {
                    devDependencies: true,
                },
            ],
        },
    },
];
