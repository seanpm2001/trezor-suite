import globals from 'globals';

import { reactConfig } from './reactConfig.mjs';
import { javascriptConfig } from './javascriptConfig.mjs';
import { typescriptConfig } from './typescriptConfig.mjs';
import { importConfig } from './importConfig.mjs';
import { jestConfig } from './jestConfig.mjs';
import { javascriptNodejsConfig } from './javascriptNodejsConfig.mjs';
import { localRulesConfig } from './localRulesConfig.mjs';

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
    ...javascriptNodejsConfig,
    ...typescriptConfig,
    ...importConfig,
    ...jestConfig,
    ...localRulesConfig,

    // Todo: Resolve this legacy!
    {
        // we are using explicit blacklist because this will enforce new rules in newly created packages
        files: [
            'packages/analytics/**/*',
            'packages/blockchain-link/**/*',
            'packages/components/**/*',
            'packages/product-components/**/*',
            'packages/connect/**/*',
            'packages/connect-common/**/*',
            'packages/connect-explorer/**/*',
            'packages/connect-web/**/*',
            'packages/connect-popup/**/*',
            'packages/connect-iframe/**/*',
            'packages/connect-examples/**/*',
            'packages/connect-plugin-ethereum/**/*',
            'packages/connect-plugin-stellar/**/*',
            'packages/request-manager/**/*',
            'packages/suite/**/*',
            'packages/suite-build/**/*',
            'packages/suite-data/**/*',
            'packages/suite-desktop-api/**/*',
            'packages/suite-storage/**/*',
            'packages/suite-web/**/*',
            'packages/transport/**/*',
            'packages/utxo-lib/**/*',
            'scripts/**/*',
            'docs/**/*',
        ],
        rules: {
            '@typescript-eslint/no-shadow': 'off',
            'import/no-default-export': 'off',
            'import/order': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            'no-console': 'off',
            'react/jsx-no-undef': 'off',
            'no-catch-shadow': 'off',
            '@typescript-eslint/no-restricted-imports': 'off',
            'no-restricted-syntax': 'off',
        },
    },

    // Tests
    {
        files: ['**/__fixtures__/**/*'],
        rules: {
            'import/no-default-export': 'off', // Todo: we have many default exports in fixtures, we shall get rid of them
        },
    },

    // ESLint config itself
    {
        files: ['eslint.config.mjs'],
        rules: {
            'import/no-default-export': 'off',
            'import/no-extraneous-dependencies': 'off',
        },
    },
];
