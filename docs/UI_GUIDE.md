# UI 디자인 가이드

## 디자인 원칙
1. 도구처럼 보여야 한다. 캔버스와 에디터가 주인공이고 UI 크롬은 최소화한다.
2. 색상은 노드 구분을 위한 파스텔 팔레트와 라임 그린 포인트 단 하나만 사용한다.
3. 모든 인터랙션은 직접적이어야 한다. 모달·오버레이·애니메이션은 꼭 필요한 곳에만 쓴다.

## AI 슬롭 안티패턴 — 하지 마라
| 금지 사항 | 이유 |
|-----------|------|
| `backdrop-filter: blur()` | glass morphism은 AI 템플릿의 가장 흔한 징후 |
| gradient-text (배경 그라데이션 텍스트) | AI가 만든 SaaS 랜딩의 1번 특징 |
| "Powered by AI" 배지 | 기능이 아니라 장식. 사용자에게 가치 없음 |
| `box-shadow` 글로우 애니메이션 | 네온 글로우 = AI 슬롭 |
| 보라/인디고 브랜드 색상 | "AI = 보라색" 클리셰; 우리 포인트는 `#7FD51A` |
| 모든 카드에 동일한 `rounded-2xl` | 균일한 둥근 모서리는 템플릿 느낌 |
| 배경 gradient orb (`blur-3xl` 원형) | 모든 AI 랜딩 페이지에 있는 장식 |

## 색상

### 시맨틱 토큰 (컴포넌트에서 사용)
| 토큰 | 라이트 | 다크 |
|------|--------|------|
| `background` | `#FFFFFF` | `#2C2C2C` |
| `foreground` | `#2C2C2C` | `#FFFFFF` |
| `surface` | `#F5F5F5` | `#404040` |
| `surface-hover` | `#E5E5E5` | `#535353` |
| `surface-active` | `#CFCFCF` | `#6C6C6C` |
| `border` | `#E5E5E5` | `#535353` |
| `muted` | `#858585` | `#B8B8B8` |

### 포인트 컬러
| 토큰 | 값 |
|------|-----|
| `main` | `#7FD51A` (라임 그린) |
| `main-10` | `#F5FDEC` (10% tint, 체크박스 배경 등) |
| `main-5` | `#F9FDF3` (5% tint) |

### 노드 파스텔 팔레트 (배경 / 텍스트)
| 이름 | 배경 (Sub) | 텍스트 (Text) |
|------|-----------|--------------|
| gray | `#EFEFEF` | `#2C2C2C` |
| red | `#FED7D9` | `#6D3537` |
| orange | `#FDE5CD` | `#59432C` |
| yellow | `#FBF0BC` | `#5D5428` |
| green | `#E4F9C8` | `#40512A` |
| mint | `#D0F1E3` | `#1F4C3A` |
| blue | `#D0EEFB` | `#254756` |
| purple | `#EEDBFA` | `#563B68` |
| pink | `#FBDAEB` | `#683B52` |

> 노드 배경은 `bg-sub-{color}`, 텍스트는 `text-text-{color}` Tailwind 유틸리티를 사용한다. (`src/styles/colorPairs.ts` 참고)

### 그레이 스케일
`gray-100(#404040)` → `gray-900(#F5F5F5)` 9단계. 숫자가 클수록 밝다.

## 컴포넌트

### 노드 — 메인(PROJECT)
```
rounded-lg border border-[#D9D9D9] bg-white
padding: 26px 36px
max-width: 200px
```

### 노드 — 서브(일반)
```
rounded-full bg-sub-{color}
padding: 6px 12px
max-width: 200px
```

### 노드 — hover / 연결 대상
```
border: 3px solid #93C5FD   (드래그 snap 예정 상태)
border: 2px solid {viewer color}  (다른 유저가 보고 있음)
```

### 에디터 패널
```
bg-white rounded-xl border border-border shadow-md
min-width: 280px
```

### 모달 (보관 확인 등)
```
w-[360px] rounded-xl border border-gray-200 bg-white p-5 shadow-xl
배경 오버레이: bg-black/40
```

### 버튼
```
Primary (확인):  rounded-md bg-foreground px-3 py-1.5 text-sm text-background
Secondary (취소): rounded-md border border-border px-3 py-1.5 text-sm
```

### 체크박스 (에디터 내)
```
체크 해제: border-1.5 border-[#CFCFCF] rounded-[3px] bg-white
체크 완료: bg-[#7FD51A] border-[#7FD51A] + SVG 체크마크, 텍스트는 line-through text-[#A0A0A0]
```

## 레이아웃
- 전체 높이 고정: `h-screen`, 스크롤 없음. 캔버스가 남은 공간을 채움.
- 사이드바: 좌측 고정, 너비는 드래그 리사이즈 가능 (`sidebarWidth` in Context).
- 그래프 캔버스: `w-full h-full bg-background`로 나머지 공간 채움.
- 정렬: 좌측 정렬 기본. 모달·오버레이만 중앙 정렬.

## 타이포그래피
| 유틸리티 | 크기 | 굵기 | 용도 |
|---------|------|------|------|
| `typo-h1` | 16px / 26px | 700 | 섹션 제목, 강조 텍스트 |
| `typo-sub1` | 12px / 20px | 600 | 서브 레이블, 뱃지 |
| `typo-body1` | 14px / 24px | 400 | 일반 본문 |
| `typo-body2` | 14px / 24px | 400 | 보조 본문 (body1과 동일 스펙, 의미적 구분) |
| `typo-cap1` | 12px / 20px | 700 | 캡션 강조 |
| `typo-cap2` | 12px / 20px | 400 | 캡션 일반 |
| `typo-cap3` | 10px / 18px | 400 | 최소 라벨 (협업 커서 이름 등) |

폰트: Geist Sans(본문) + Geist Mono(코드). Next.js `next/font`로 CSS 변수로 주입.

## 에디터 타이포그래피 (Lexical)
| 클래스 | 크기 | 용도 |
|--------|------|------|
| `.ne-h1` | 20px / 700 | 에디터 H1 |
| `.ne-h2` | 17px / 600 | 에디터 H2 |
| `.ne-h3` | 14px / 600 | 에디터 H3 |
| `.ne-root` | 13px / 1.75 | 에디터 기본 본문 |
| `.ne-inline-code` | 12px mono | 인라인 코드, 텍스트 색 `#D44` |
| `.ne-code-block` | 12px mono | 코드 블록, `bg-surface` |
| `.ne-quote` | 13px italic | 인용문, `border-l-3 text-muted` |

## 애니메이션
- 허용: 뷰포트 이동(ReactFlow `setCenter`, `duration: 800ms`), 기본 CSS transition(hover 색상 전환)
- 금지: keyframe 애니메이션, 글로우 pulse, 페이드 전환 오버레이, 스프링/바운스 효과

## 아이콘
- SVG 인라인, `strokeWidth 1.5` 기준
- 아이콘 전용 컨테이너(둥근 배경 박스)로 감싸지 않는다
- 협업 커서 아이콘은 사용자 색상으로 동적 채색

## 협업 UI
- **커서 오버레이**: 다른 유저의 포인터 위치를 `CursorOverlay`에서 실시간 렌더링. 이름 뱃지 포함.
- **에디터 커서**: `.collaboration-cursor-caret` (2px solid 세로선) + `.collaboration-cursor-label` (이름 뱃지, `top: -20px`)
- **뷰어 뱃지**: 노드를 보고 있는 유저 아바타를 노드 위에 최대 3개 표시, 초과 시 `+N`
- **참여자 색상**: `getCursorColor(userId)`로 결정, 같은 userId는 항상 같은 색상 (파스텔 팔레트 text 컬러에서 해시)
