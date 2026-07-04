import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // 코드 품질 지표 — 위반은 "관심사 분리가 필요하다"는 리팩토링 신호.
    // warn 유지: 빌드를 막지 않고 개발자가 인지해서 직접 설계 판단을 내리게 한다.
    rules: {
      complexity: ["warn", 12],
      "max-lines-per-function": [
        "warn",
        { max: 100, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      "max-depth": ["warn", 4],
      "max-params": ["warn", 4],
    },
  },
]);

export default eslintConfig;
