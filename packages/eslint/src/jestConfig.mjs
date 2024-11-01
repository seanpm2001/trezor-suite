import pluginJest from 'eslint-plugin-jest';

export const jestConfig = [
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
];
