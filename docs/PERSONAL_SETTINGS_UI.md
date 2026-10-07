# 개인 설정 UI / API 연결 지점

## 구현 구조

- `/settings`: 개인 설정 진입. workspace 헤더 사용자 메뉴의 설정으로 이동.
- `src/features/settings`: 계정·일반·구독 탭과 사진/닉네임/비밀번호/삭제 모달.
- 공용 `Modal`, `Input`, `Button` 재사용. 공용 `Switch`, `Toast` 추가.
- `usePersonalSettings`: 조회 결과, 탭, 모달, 저장/삭제 성공 후 화면 반영.
- `useSettingsRequest`: 중복 요청 잠금, pending, 오류, 언마운트 이후 응답 무시.
- `useSettingsForms`, `useGeneralSettings`, `useProfileCrop`: 입력·선택·사진 편집 로직.
- 상태는 기존 useState/useRef 컨벤션. 그래프 Context/WS와 결합하지 않음.
- Figma `saN8RhsArIYwDLDD1W2ktQ`, section `442:977` 기준. 화면에는 개발 상태 라벨을 추가하지 않음.

## API를 받은 뒤 수정할 곳

`src/api/settings.ts`의 `settingsApi`에 `src/features/settings/types.ts`의 `SettingsApi` 메서드를 연결한다. HTTP는 기존 `src/api/client.ts`와 `/api/*` rewrites를 사용한다. 도메인 컴포넌트에서 URL/서버 DTO/토큰을 처리하지 않는다.

| 메서드           | UI 입력 / 반환 계약                                                                  |
| ---------------- | ------------------------------------------------------------------------------------ |
| loadAccount      | userId, username, email, profileImageUrl, loginMethod 반환                           |
| loadGeneral      | language(ko), theme(light/dark/system), startView(overview), emailNotifications 반환 |
| loadSubscription | plan(FREE/PRO), nodeCount, chatCount, recordingMinutes 반환                          |
| updateNickname   | trim된 username → 저장된 SettingsAccount 반환                                        |
| updateProfile    | 512×512 PNG Blob 업로드 / null은 사진 삭제 → 저장된 SettingsAccount 반환             |
| changePassword   | currentPassword, newPassword → 성공 시 void                                          |
| deleteAccount    | 성공 시 void; 그때만 토큰 제거와 삭제 완료 화면 표시                                 |
| saveGeneral      | 전체 GeneralSettings 스냅샷 → 저장된 GeneralSettings 반환                            |

선택 메서드가 없으면 저장 버튼만 비활성화한다. 임의 경로/성공 응답을 만들지 않았다. 현재 어댑터는 기존 getMe 조회와 Spring `PATCH /auth/password`, `PATCH /auth/username`, `DELETE /auth/me`를 연결하며, DTO에 없는 사진/로그인 방식은 null로 둔다. 로그인 방식/구독/사용량의 미확인 값은 `—`로 표시한다. 일반 설정 초기값은 서버 저장값으로 간주하지 않는다.

닉네임·사진 변경 응답이 부분 DTO라면 어댑터에서 계정 정보를 재조회해 완전한 SettingsAccount로 반환한다. 업로드의 multipart 필드명/삭제 방식은 실제 계약에 맞춰 이 파일에서 변환한다. 비밀번호 오류 코드는 어댑터에서 `ApiError('CURRENT_PASSWORD_MISMATCH', ...)`로 정규화하면 현재 비밀번호 필드에 디자인의 오류 스타일이 적용된다. 기타 오류는 입력을 유지한 채 표시한다.

## 범위 / 후속 연결

일반 설정은 `loadGeneral`과 `saveGeneral`을 함께 연결해야 편집할 수 있다. 서버 조회 없이 초기값 전체를 전송하여 기존 설정을 덮어쓰지 않도록 두 기능을 함께 요구한다.

- 비밀번호 변경은 `{ currentPassword, newPassword }`를 기존 인증 client와 `/api/auth/password` 프록시로 전송한다. 현재 비밀번호 불일치 `AUTH-026`은 `CURRENT_PASSWORD_MISMATCH`로 정규화하며 실패하면 입력을 유지한다. 성공 응답 뒤에만 모달을 닫고 토스트를 표시한다.
- 원격 서버는 현재 비밀번호 누락/불일치 `AUTH-025`/`AUTH-026`도 HTTP 401로 반환한다. JWT 인증 실패와 혼동되지 않도록 이 요청에 한해 해당 코드만 refresh에서 제외한다. 토큰 만료 등 다른 401은 기존 refresh 큐를 유지한다. 서버가 400으로 수정되어도 오류 코드 정규화는 그대로 동작한다. 서버 상태 코드는 이 PR에서 수정하지 않는다.
- 닉네임은 배포 Spring `PATCH /auth/username`(`{ username }`, 응답은 문자열)으로 보내고, 성공 뒤 `/user/me`를 다시 읽어 화면에 반영한다. 온보딩 API는 설문값을 덮어쓰므로 사용하지 않는다.
- 계정 삭제는 `DELETE /auth/me`(하드 삭제)이며 소유한 워크스페이스가 있으면 `AUTH-033`(409)으로 거절된다. 서버가 주는 사유를 모달 오류로 그대로 보여준다. 성공 응답 뒤에만 토큰을 지우고 삭제 완료 화면으로 이동한다.
- 프로필 사진·일반 설정은 배포 Nest/Spring 스펙에 계약이 없어 저장 요청을 보내지 않는다.
- 구독·사용량 API는 현재 기능 범위에서 제외한다.
- Google 계정의 비밀번호 신규 설정은 이번 연결 범위가 아니다. 현재 모달은 현재 비밀번호를 알고 있는 계정의 변경 흐름이며, loginMethod를 조회할 필드가 없어 임의로 EMAIL/GOOGLE을 추정하지 않는다.
- 사진은 중앙 crop/확대(1~3배), JPG/PNG 5MB 이하, 디코딩 40MP 이하. 드래그 위치 이동은 없음.
- 라이트 디자인은 Figma 기준. 다크/시스템은 기존 neutral 토큰으로 설정 화면에만 적용. 그래프 테마/다음 진입 시 시작 화면/이메일 발송 정책을 앱 전체에 적용하는 부분은 별도 소비자 연결이 필요하다.
- 구독 결제, 이어서 보기, 영어, 브라우저 알림은 디자인에 있는 ‘추후 추가 예정’ 상태 유지. 멤버·초대는 이번 개인 설정 범위 밖.
- 계정 삭제 범위 확인: 서버는 users 행과 연관 행(OAuth 연동, 워크스페이스 참여, 회의, 온보딩, 약관 동의)을 삭제하고 소유 워크스페이스가 있으면 거절한다. 디자인 문구(모든 프로젝트·노드·녹음 파일 즉시 삭제)와 표현이 다를 수 있어 문구 확정이 필요하다.
- 기존 닉네임 메뉴/API, 로그인·회원가입 정책, 그래프 동작은 변경하지 않음.

## 검증 항목

- 계정 조회 실패/재시도, 일반·구독 탭 전환, Google/이메일 계정 분기.
- 모달 X/Escape/배경 닫기, 요청 중 닫기·중복 제출 방지, 오류 시 입력 보존.
- 닉네임 2~12자, 비밀번호 조합/확인/재사용 금지, 정확한 ‘계정 삭제’ 입력.
- 파일 형식·크기·깨진 이미지, crop와 실제 출력 일치, object URL 해제.
- 서버 성공 후에만 닉네임/사진/설정/삭제 화면/토스트 반영.
- 실제 API E2E는 메서드 연결 후 테스트 계정으로 별도 검증. UI 검증은 임시 주입 어댑터로 수행하고 검증 경로는 최종 산출물에서 제거.

## ESLint 설계 경고

2026-10-05 검증: TypeScript 검사 및 프로덕션 빌드 통과, Vitest 185개 통과(설정 규칙 38개 포함), 수정한 설정 파일 린트 오류 0개/경고 8개, git diff --check 통과. 브라우저에서 계정·일반·구독 및 네 가지 모달, 닉네임 실패/재시도/성공, 비밀번호 오류, 삭제 확인/실패, 요청 중 닫기 차단, 테마 반영, 탭 스크롤 초기화와 이미지 로딩을 확인했다. 사진 파일 업로드/디코딩과 실제 서버 CRUD E2E는 브라우저로 검증하지 않았다. 임시 검증 라우트는 제거했다.

저장소 규칙에 따라 경고만을 없애기 위한 자동 리팩터링은 하지 않았다.

| 위치 | 경고 / 이유 |
| --- | --- |
| AccountSettings.tsx:7 | max-lines-per-function: 프로필·로그인·삭제 카드 JSX |
| GeneralSettings.tsx:9 | max-lines-per-function: 환경·그래프·알림 섹션 JSX |
| PersonalSettingsScreen.tsx:16 | complexity 13/12: 조회 상태·탭·모달 렌더 분기 |
| ProfilePhotoModal.tsx:10 | max-lines-per-function: crop·확대·파일 선택·액션 JSX |
| SettingsGraphPreview.tsx:10 | max-lines-per-function: Figma 정적 그래프 미리보기 레이어 |
| SettingsShell.tsx:27 | max-lines-per-function: 내비게이션·장식·모션 JSX |
| SubscriptionSettings.tsx:6 | max-lines-per-function: 플랜·사용량·결제 안내 JSX |
| usePersonalSettings.ts:26 | max-lines-per-function: 페이지 조회·모달·각 변경 성공 처리 |

기존 workspace/layout, ChipHeader, UserMenu의 길이 및 기존 img 관련 경고는 이번 변경 범위의 설계 수정 대상이 아니다.

## 2026-10-06 비밀번호 API 연결 검증

- 배포 Spring Swagger 및 원격 AuthController/AuthService/AuthError의 경로·DTO·코드를 확인했다.
- 타입 검사 통과, Vitest 196개(설정 규칙 38개, 비밀번호 오류 정규화 4개, 요청별 refresh 제외 정책 7개) 통과.
- 프로덕션 빌드(`next build --webpack`) 통과.
- lint 오류 0개/경고 9개: 기존 설정 UI 설계 경고 8개와 공유 client의 복잡도 19 경고. 서버의 401 검증 오류를 처리하는 분기가 추가되어 기존 복잡도 경고 수치가 증가했다. 규칙에 따라 경고만을 위한 리팩터링은 하지 않았다.
- 독립 Bugbot 방식 대체 리뷰에서 동작·회귀 버그 없음. 실제 서버 비밀번호 변경/브라우저 E2E를 실행한 결과는 아니다. 검증 때문에 사용자 비밀번호를 바꾸거나 실제 토큰을 회전시키지 않았다.
