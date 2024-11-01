import globals from 'globals';

import { reactConfig } from './reactConfig.mjs';
import { javascriptConfig } from './javascriptConfig.mjs';
import { typescriptConfig } from './typescriptConfig.mjs';
import { importConfig } from './importConfig.mjs';
import { jestConfig } from './jestConfig.mjs';

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

    ...reactConfig,
    ...javascriptConfig,
    ...typescriptConfig,
    ...importConfig,
    ...jestConfig,

    // Tests
    {
        files: ['**/__fixtures__/**/*'],
        rules: {
            'import/no-default-export': 'off', // Todo: we have many default exports in fixtures, we shall get rid of them
        },
    },

    // ESLint config
    {
        files: ['eslint.config.mjs'],
        rules: {
            'import/no-default-export': 'off',
            'import/no-extraneous-dependencies': 'off',
        },
    },
];
