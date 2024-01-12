module.exports = {
    env: {
        browser: true,
        es2021: true,
    },
    extends: ["eslint:recommended", "prettier"],
    overrides: [
        {
            env: {
                node: true,
            },
            files: [".eslintrc.{js,cjs}", "src/"],
            parserOptions: {
                sourceType: "script",
            },
        },
    ],
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
    },
    rules: {
        "no-duplicate-imports": ["error"],
        "no-use-before-define": ["error"],
        curly: ["error"],
        eqeqeq: ["error"],
        "no-implicit-coercion": ["error"],
        "no-var": ["error"],
        "prefer-arrow-callback": ["warn"],
        "prefer-const": ["warn"],
        "sort-imports": ["error"],
    },
};
