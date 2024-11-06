import path from 'path';
import { fileURLToPath } from 'url';
import pluginImport from 'eslint-plugin-import';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const importConfig = [
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
            // Additional
            'import/no-default-export': 'error', // We don't want to use default exports, always use named exports
            'import/no-anonymous-default-export': [
                'error',
                {
                    allowArray: true,
                    allowLiteral: true,
                    allowObject: true,
                },
            ],
            'import/order': [
                1,
                {
                    groups: [['builtin', 'external'], 'internal', ['sibling', 'parent']],
                    pathGroups: [
                        {
                            pattern: 'react*',
                            group: 'external',
                            position: 'before',
                        },
                        { pattern: '@trezor/**', group: 'internal' }, // Translates to /packages/** */
                        { pattern: '@suite-native/**', group: 'internal' },
                        { pattern: '@suite-common/**', group: 'internal' },
                        { pattern: 'src/**', group: 'internal', position: 'after' },
                    ],
                    pathGroupsExcludedImportTypes: ['internal', 'react'],
                    'newlines-between': 'always',
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
                        '**/.storybook/**',
                    ],

                    includeTypes: true,
                },
            ],

            // Offs
            'import/no-unresolved': 'off', // Does not work with Babel react-native to react-native-web
        },
    },
];
