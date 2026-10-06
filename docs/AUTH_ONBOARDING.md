# 회원가입 및 온보딩 연결

브랜치: `feat/auth-onboarding` (회원가입 커밋 `6a98ab3`에서 분기).
기존 개인설정 작업 폴더와 분리되어 있으며, 커밋/push는 별도 요청 시 진행한다.

## 동작

- 일반 가입: 이메일 인증 → `/auth/signup` → 동일 이메일/비밀번호로 `/auth/login` → `/user/me` → `/onboarding`.
- 가입 성공 후 로그인/사용자 조회 실패 시 계속하기로 재시도한다. 성공한 가입 API는 반복하지 않는다.
- 가입 payload: `email`, `password`, `termsOfService`, `privacyPolicy`, `marketing`. 이름/전화번호는 보내지 않는다.
- Google 신규 가입: 실제 약관 동의 → 가입 완료 → `/user/me`의 `username`을 온보딩 이름 기본값으로 사용.
- 온보딩: 닉네임(2~12자) → 사용 목적(단일) → 회의 방식(복수). 이전 이동은 입력 유지, 건너뛰기는 해당 답변을 비운다.
- 마지막 단계에서만 `/auth/onboard`에 `userName`, `usageProposal`, `meeting`을 저장한다. 실패 시 완료 화면으로 넘어가지 않는다.
- 완료 CTA는 기존 워크스페이스/프로젝트 노드 API를 사용한다. 나중에 할게요는 프로젝트 노드를 생성하지 않는다.
- 모든 API는 기존 `/api` 프록시와 응답 envelope 해제/401 갱신 큐를 사용한다. baseURL/환경 변수는 변경하지 않는다.
- 새 가입의 자동 로그인은 세션 저장을 사용한다. 일반 로그인은 기존 로그인 유지 선택을 따른다. access token은 메모리에만 보관한다.

## 서버 후속 연결

### Google 기본 이름

사용자 요청에 따라 Google 이름이 가입 시 저장되어 `/user/me`에서 조회된다고 전제한다.
현재 원격 Spring main/Swagger는 `/auth/oauth/signup/complete`의 `username`을 필수로 요구한다.
프론트는 가짜 이름을 보내지 않으며 서버에서 가입 티켓의 displayName을 저장하고 해당 필수 조건을 조정해야 한다.
현재 계약이 유지되면 Google 신규 가입은 실패 응답을 표시하며, 이를 실제 연결 완료로 간주하지 않는다.

### 완료 플래그

현재 공개 `user/me`/로그인 응답에는 온보딩 완료 조회 필드가 없다.
`onboardingEntry.ts`의 `COMPLETION_FIELD`는 null이다. 필드를 임의로 추정하지 않는다.
서버 필드 추가 시 `UserMeResponse`에 실제 필드를 추가하고 이 키를 지정한다.

- boolean true: 온보딩 스킵 → workspace
- boolean false: onboarding
- 누락/null/알 수 없는 타입: 기존 계정은 workspace, 새 가입 진행 중이면 onboarding

새 가입 진행 중 상태만 sessionStorage에 userId로 저장하고 성공 시 제거한다.
서버 필드 연결 전에는 다른 기기/탭에서 미완료 상태를 복구할 수 없다.

## 디자인 및 검증 범위

Figma `01-D · 온보딩` 4개 화면. 기존 그래프 사용 안내 팝업과는 별도다.
AuthLayout/Button/Input와 기존 키프레임 모션을 재사용하고 별도 SVG는 Figma 원본으로 보관한다.
약관 본문 보기 연결, 로그인 잠금, 비밀번호 찾기 서버 로직은 기존 합의대로 범위 밖이다.
입력 규칙과 온보딩 진입 분기는 Node 단위 테스트로 검증한다. 실제 배포 DB에 가입·온보딩 데이터를 만들지 않는다.
브라우저에서 전체 가입/저장 흐름과 실제 서버 저장 결과는 아직 검증하지 않았다.
Google 실제 자동 이름 저장과 완료 조회는 위 서버 계약 확정 이후 검증한다.

## 2026-10-06 검증 및 리뷰

- Vitest: 16개 파일, 166개 테스트 통과. 새 온보딩 테스트 19개 포함.
- TypeScript: `tsc --noEmit` 통과.
- Next.js 프로덕션 빌드: `next build --webpack` 통과.
- ESLint: 오류 0개, 경고 12개. 기존 경고와 새 UI의 복잡도/길이 경고가 포함된다. 경고만을 위한 리팩터링은 하지 않았다.
- Bugbot: P2 1건. 자동 로그인 성공 후 `/user/me` 실패 → 새로고침 시 신규 가입 진행 표시가 없어 온보딩을 건너뛸 수 있다. 일반/Google 신규 가입 모두 해당한다. 리뷰 이후 수정은 아직 하지 않았다.
- 완료 CTA는 선택한 워크스페이스 ID를 URL로 전달하고 workspace 레이아웃에서 목록 내 해당 ID를 선택한다. 없는 ID는 기존 첫 워크스페이스 선택으로 처리한다.
