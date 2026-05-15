/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    testMatch: ["**/__tests__/**/*.test.ts"],
    setupFilesAfterEnv: [],
    moduleNameMapper: {
        "^@taskifier/env/server$": "<rootDir>/../../packages/env/src/server.js",
        "^@taskifier/types$": "<rootDir>/../../packages/types/src/index.js",
        "^@taskifier/utils$": "<rootDir>/../../packages/utils/src/index.js",
        "^@taskifier/(.*)$": "<rootDir>/../../packages/$1/src",
    },
    transform: {
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                tsconfig: {
                    strict: true,
                    noUncheckedIndexedAccess: true,
                },
            },
        ],
    },
};
