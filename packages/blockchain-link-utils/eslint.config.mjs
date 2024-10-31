import parentConfig from '../../eslint.config.mjs';

export default [
    ...parentConfig,
    {
        rules: {
            'import/no-extraneous-dependencies': [
                'error',
                {
                    includeTypes: true,
                },
            ],
        },
    },
];
