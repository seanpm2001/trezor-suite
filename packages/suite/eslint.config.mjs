import { eslint } from '@trezor/eslint';

export default [
    ...eslint,
    {
        rules: {
            'react/style-prop-object': [
                'error',
                {
                    allow: ['FormattedNumber'],
                },
            ],
            'no-restricted-syntax': 'off', // Todo: this should be fixed in codebase and this line removed
            'import/order': 'off', // Todo: fix and solve
        },
    },
];
