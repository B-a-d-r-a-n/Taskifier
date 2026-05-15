const js = require("@eslint/js");

module.exports = [
    js.configs.recommended,
    {
        files: ["eslint.config.js"],
        languageOptions: {
            sourceType: "commonjs",
        },
        rules: {
            "no-undef": "off",
        },
    },
];
