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
    // 앱 소스가 아닌 참고 자산 보관 폴더(이미지·문서). 여기 딸려온 스크립트까지
    // 린트하면 yarn lint가 상시 실패해 실제 소스의 신호를 가린다.
    "etc/**",
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
