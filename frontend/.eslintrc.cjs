module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true
  },
  extends: ["plugin:vue/vue3-recommended", "eslint:recommended", "prettier"],
  parser: "vue-eslint-parser",
  parserOptions: {
    parser: "@typescript-eslint/parser",
    ecmaVersion: "latest",
    sourceType: "module",
    extraFileExtensions: [".vue"]
  },
  plugins: ["vue"],
  rules: {
    "vue/multi-word-component-names": "off"
  }
};
