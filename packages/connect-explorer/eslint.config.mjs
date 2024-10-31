import * as mdx from 'eslint-plugin-mdx';
import parentConfig from '../../eslint.config.mjs';

export default [
    ...parentConfig,
    // Mdx
    {
        ...mdx.flat,
        rules: {
            'jsx-a11y/click-events-have-key-events': 'off',
            'jsx-a11y/no-static-element-interactions': 'off',
            'import/no-default-export': 'off',
            'no-console': 'off',
            'no-restricted-syntax': 'off',
        },
    },

    // Typescript
    {
        rules: {
            '@typescript-eslint/no-restricted-imports': 'off',
            '@typescript-eslint/no-shadow': 'off',
        },
    },

    // React
    {
        rules: {
            'react/jsx-filename-extension': [
                'error',
                {
                    extensions: ['.tsx', '.mdx'],
                },
            ],
        },
    },
];
