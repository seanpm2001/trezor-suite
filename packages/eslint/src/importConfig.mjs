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
];
