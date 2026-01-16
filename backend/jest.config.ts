import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  moduleFileExtensions: ["ts", "js", "json"],
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", decorators: true },
          target: "es2021"
        },
        module: { type: "commonjs" }
      }
    ]
  },
  collectCoverageFrom: ["src/**/*.ts"],
  coverageDirectory: "coverage",
  setupFiles: ["<rootDir>/test/setup-env.ts"],
  testTimeout: 20000
};

export default config;
