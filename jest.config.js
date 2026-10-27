/** @type {import("jest").Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^server-only$": "<rootDir>/test/server-only-stub.ts",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      // The app's tsconfig targets the Next bundler; Jest needs CommonJS.
      {
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
          jsx: "react-jsx",
          esModuleInterop: true,
        },
      },
    ],
  },
};
