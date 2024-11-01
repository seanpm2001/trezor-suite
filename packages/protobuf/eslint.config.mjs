import parentConfig from '../../eslint.config.mjs';

export default [
    ...parentConfig,
    {
        rules: {
            '@typescript-eslint/ban-types': 'off', // allow {} in protobuf.d.ts
            '@typescript-eslint/no-shadow': 'off',
        },
    },
];
