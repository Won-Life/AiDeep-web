# UI 규칙 — src/ 전역

## 색상 — 반드시 디자인 토큰 변수 사용

하드코딩된 hex 값을 쓰지 않는다. 우선순위:
1. `docs/UI_GUIDE.md`의 시맨틱 토큰 확인
2. `src/app/globals.css`의 CSS 변수 확인
3. Tailwind 생성 클래스 사용

| hex | CSS 변수 | Tailwind 클래스 |
|-----|---------|----------------|
| `#CFCFCF` | `--ds-gray-700` | `border-gray-700` / `text-gray-700` |
| `#E5E5E5` | `--ds-gray-800` / `--border` | `border-border` / `bg-surface-hover` |
| `#F5F5F5` | `--ds-gray-900` / `--surface` | `bg-surface` |
| `#858585` | `--ds-gray-400` / `--muted` | `text-muted` |
| `#A0A0A0` | `--ds-gray-500` | `text-gray-500` |
| `#2C2C2C` | `--ds-black` / `--foreground` | `text-foreground` / `text-black` |
| `#FFFFFF` | `--ds-white` / `--background` | `bg-background` / `text-white` |
| `#7FD51A` | `--ds-main` | `bg-main` / `text-main` |

인라인 `style={}` 에서 색상을 써야 하면 `rgb(var(--ds-gray-700))` 형태로 변수 참조한다.

## 반응형 — 고정 픽셀 대신 Tailwind 클래스 우선

- 크기·여백은 Tailwind 클래스로 표현한다 (`w-[315px]`, `p-3`, `rounded-[16px]` 등).
- 동적으로 계산해야 하는 위치(zIndex, left/right 방향 전환 등)만 `style={}`을 허용한다.
- `style={{ color: "#xxx" }}` 형태는 금지. 반드시 Tailwind 클래스 또는 CSS 변수로 대체.

## Figma 디자인 → 코드 변환 규칙

1. `rounded-[NNpx]` → Tailwind arbitrary value 그대로 사용 (`rounded-[16px]`).
2. Figma에서 `border-[#cfcfcf]`가 나오면 → `border-gray-700`.
3. Figma `shadow-*` 없음 → `shadow-*` 클래스 추가 금지. Figma에 있는 것만 반영.
4. Figma 고정 너비(`w-[315px]`) → Tailwind arbitrary class로 옮기고, 컨테이너에 종속되는 경우(`inline` 모드 등) `w-full` 사용.
