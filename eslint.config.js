const js = require("@eslint/js");

module.exports = [
    js.configs.recommended,
    {
        ignores: ["**/eslint.config.js"],
    },
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: require("@typescript-eslint/parser"),
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
            },
            globals: {
                process: "readonly",
                Buffer: "readonly",
                console: "readonly",
                jest: "readonly",
                describe: "readonly",
                it: "readonly",
                expect: "readonly",
                test: "readonly",
                beforeEach: "readonly",
                afterEach: "readonly",
                beforeAll: "readonly",
                afterAll: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                fetch: "readonly",
                AbortSignal: "readonly",
                Headers: "readonly",
                Request: "readonly",
                Response: "readonly",
            },
        },
        plugins: {
            "@typescript-eslint": require("@typescript-eslint/eslint-plugin"),
        },
        rules: {
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/no-explicit-any": "error",
            "no-console": "warn",
        },
    },
    {
        files: [
            "**/*.test.ts",
            "**/*.test.tsx",
            "**/*.spec.ts",
            "**/*.spec.tsx",
        ],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
        },
    },
];
