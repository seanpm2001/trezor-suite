import parentConfig from '../../eslint.config.mjs';

export default [
    ...parentConfig,
    {
        rules: {
            'react/style-prop-object': 'off',
            '@typescript-eslint/no-use-before-define': 'off',
            'no-continue': 'off',
            'no-restricted-properties': 'off',
            '@typescript-eslint/no-shadow': 'off',
        },
    },
];
