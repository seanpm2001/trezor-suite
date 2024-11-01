import path from 'path';
import { fileURLToPath } from 'url';

import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import pluginJest from 'eslint-plugin-jest';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginImport from 'eslint-plugin-import';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
    {
        ignores: [
            '**/.nx/*',
            '**/lib/*',
            '**/libDev/*',
            '**/dist/*',
            '**/coverage/*',
            '**/build/*',
            '**/build-electron/*',
            '**/node_modules/*',
            '**/public/*',
            'packages/suite-data/files/*',
            'packages/protobuf/scripts/protobuf-patches/*',
            'packages/address-validator',
            'packages/connect-examples',
            '**/ci/',
            'eslint-local-rules/*',
        ],
    },
    { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
    { languageOptions: { globals: globals.browser } },
    {
        languageOptions: {
            globals: {
                ...globals.serviceworker,
                ...globals.browser,
            },
        },
    },

    // JS
    pluginJs.configs.recommended,
    {
        rules: {
            // Offs
            'no-undef': 'off', // Todo: write description

            // Additional rules
            'no-console': ['error', { allow: ['warn', 'error'] }],
            'require-await': ['error'],
        },
    },
    {
        files: ['**/*.js'], // Usually config files
        rules: {
            'no-console': 'off',
        },
    },

    // React
    pluginReact.configs.flat.recommended,
    {
        languageOptions: {
            ...pluginReact.configs.flat.recommended.languageOptions,
        },
        settings: { react: { version: 'detect' } },
        rules: {
            // Offs
            'react/react-in-jsx-scope': 'off', // We are not importing React in every file
            'react/prop-types': 'off', // This rule is not needed when using TypeScript
            'react/display-name': 'off', // This is annoying for stuff like `forwardRef`. Todo: reconsider
            'no-prototype-builtins': 'off', // Todo: just temporary, reconsider to remove it
        },
    },

    // React Hooks
    {
        plugins: { 'react-hooks': pluginReactHooks },
        rules: pluginReactHooks.configs.recommended.rules,
    },

    // Typescript
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

    // Import
    pluginImport.flatConfigs.recommended,
    {
        settings: {
            'import/ignore': ['node_modules', '\\.(coffee|scss|css|less|hbs|svg|json)$'],
            'import/resolver': {
                node: {
                    paths: [path.resolve(__dirname, 'eslint-rules')],
                },
            },
        },
        rules: {
            // Offs
            'import/no-unresolved': 'off', // Does not work with Babel react-native to react-native-web
            'import/no-default-export': 'error',
            'import/no-anonymous-default-export': [
                'error',
                {
                    allowArray: true,
                    allowLiteral: true,
                    allowObject: true,
                },
            ],
            'import/no-extraneous-dependencies': [
                'error',
                {
                    devDependencies: [
                        '**/*fixtures*/**',
                        '**/*.test.{tsx,ts,js}',
                        '**/blockchain-link/tests/**',
                        '**/blockchain-link/webpack/**',
                        '**/suite-desktop-core/**',
                        '**/*e2e/**',
                        '**/suite/src/support/tests/**',
                        '**/suite-data/**',
                        '**/*.stories.*',
                        '**/*webpack.config*',
                        '**/webpack/**',
                    ],

                    includeTypes: true,
                },
            ],
        },
    },

    // Tests
    pluginJest.configs['flat/recommended'],
    {
        rules: {
            'jest/valid-title': 'off', // This rule does not use Typescript and produces false positives
            'jest/valid-describe-callback': 'off', // This rule does not use Typescript and produces false positives
            'jest/no-disabled-tests': 'off', // Well, what can I say... ¯\_(ツ)_/¯ We skip tests sometimes.
            'jest/no-focused-tests': 'off', // Same as above, but // Todo: shall be easy to get rid of this
            'jest/no-conditional-expect': 'off', // Todo: we shall solve this, this is bad practice
            'jest/expect-expect': 'off', // Todo: we have test with no assertions, this may be legit but it needs to be checked
        },
    },
    {
        files: ['**/__fixtures__/**/*'],
        rules: {
            'import/no-default-export': 'off', // Todo: we have many default exports in fixtures, we shall get rid of them
        },
    },

    // ESLint config
    {
        files: ['**/eslint.config.mjs'],
        rules: {
            'import/no-default-export': 'off',
            'import/no-extraneous-dependencies': 'off',
        },
    },
];
