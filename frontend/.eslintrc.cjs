module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true
  },
  extends: [
    "plugin:vue/vue3-recommended",
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  parser: "vue-eslint-parser",
  parserOptions: {
    parser: "@typescript-eslint/parser",
    ecmaVersion: "latest",
    sourceType: "module",
    extraFileExtensions: [".vue"]
  },
  plugins: ["vue", "@typescript-eslint"],
  rules: {
    "vue/multi-word-component-names": "off",
    "vue/attribute-hyphenation": "off",
    "vue/v-on-event-hyphenation": "off",
    "vue/attributes-order": "off",
    "vue/no-template-shadow": "off",
    "vue/require-default-prop": "off",
    "vue/require-explicit-emits": "off",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^(_|ignored)"
      }
    ],
    "@typescript-eslint/no-explicit-any": "off",
    "no-empty": [
      "error",
      {
        allowEmptyCatch: true
      }
    ]
  }
};
