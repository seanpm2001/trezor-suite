import pluginLocalRules from 'eslint-plugin-local-rules';

export const localRulesConfig = [
    {
        plugins: {
            'local-rules': pluginLocalRules,
        },
        rules: {
            'local-rules/no-override-ds-component': [
                'error',
                { packageName: '@trezor/components' },
            ],
            // Todo: figure out hot to re-enable this rule
            // 'local-rules/no-override-ds-component': [
            //     'error',
            //     { packageName: '@trezor/product-components' },
            // ],
        },
    },
];
