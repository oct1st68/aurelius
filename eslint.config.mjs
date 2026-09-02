import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Ban browser-native dialogs in application code (spec: custom confirmation dialogs).
      "no-restricted-globals": [
        "error",
        { name: "alert", message: "Use the custom ConfirmDialog component." },
        { name: "confirm", message: "Use the custom ConfirmDialog component." },
        { name: "prompt", message: "Use the custom PromptDialog component." },
      ],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "test-results/**",
      "playwright-report/**",
      "data/local/**",
      "storage/local/**",
    ],
  },
];

export default eslintConfig;
