import baseConfig from "./eslint.config.js";
import security from "eslint-plugin-security";

export default [
  ...baseConfig,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      security,
    },
    rules: {
      "security/detect-object-injection": "off",
      "security/detect-eval-with-expression": "error",
      "security/detect-non-literal-fs-filename": "error",
      "security/detect-unsafe-regex": "error",
    },
  },
];
