# OnNode 로그인 UI

## 범위

- 기준: Figma `saN8RhsArIYwDLDD1W2ktQ`, 완성 화면의 로그인 `401:1079`, 로그인 오류 `401:1289`, 비밀번호 찾기 `401:1526`, 새 비밀번호 `401:1618`.
- `/login`: 이메일 로그인, 유지 선택, Google 로그인, 기존 이메일 회원가입으로 이동.
- `/forgot-password`, `/reset-password`: 화면과 입력 인터랙션만 제공. 서버 요청, 이메일 발송, 비밀번호 변경, 성공/오류 상태 전환은 구현하지 않는다.
- 기존 일반 회원가입·OAuth 추가 정보 처리·워크스페이스 생성 로직은 유지한다.
- 일반 회원가입 및 OAuth 추가 정보 화면의 시각적 개편은 이 범위에 포함하지 않는다.
- 모바일 전용 디자인은 후속 작업. 좁은 화면의 기본 overflow 방지는 적용한다.

## 컴포넌트와 상태

- `src/components/ui/Button`, `Input`, `Modal`: 공용 기본 UI. Modal은 controlled `isOpen/onClose`, size 및 content/backdrop 확장 class를 제공한다. 이 작업에 필요한 모달 화면이 없어 기존 모달을 강제로 전환하지 않는다.
- `src/features/auth/`: 화면, 폼 필드, 배경, 도메인 훅. 로그인 페이지는 화면 선택만 담당한다.
- `useLoginForm`: 입력·유지 선택·요청 상태. 제출 중 중복 요청을 ref로 차단한다.
- `useAuthSession`: 부팅 시 세션 확인. 기존 토큰의 회전과 새 로그인이 경합하지 않도록 복원 중 요청을 막는다.
- 토큰은 React Context에 보관하지 않고 기존 API 클라이언트에서 관리한다.

## 저장 정책

- access token: 메모리만 사용.
- 유지 선택: refresh token localStorage. 미선택: sessionStorage.
- 새 로그인은 반대 저장소의 refresh token을 제거한다. 갱신은 원래 저장 위치를 유지한다. 로그아웃은 양쪽을 지운다.
- sessionStorage는 HttpOnly 세션 쿠키가 아니다. Web Storage의 XSS 위험은 유지되며 쿠키 전환은 별도 FE/BE 작업이다.
- OAuth 선택은 토큰이 아닌 저장 선호만 sessionStorage에 전달한다. 콜백이 다른 origin에 도착하면 전달할 수 없으므로 기존 기본값(localStorage)으로 처리된다. OAuth 리다이렉션 주소는 변경하지 않는다.
- 공개 인증 요청의 401은 refresh하지 않고 호출부에 반환한다. 보호된 API의 refresh queue는 유지한다.

## 의도적으로 구현하지 않는 정책

- 로그인 5회 실패 / 10분 잠금: 서버 정책과 연동 미구현.
- 미인증 이메일 로그인 상태: UI·분기 미구현.
- 비밀번호 찾기·변경 API 및 링크 재발송, 토큰 만료/완료 상태: 미구현. 발송·변경 성공을 가장하지 않는다.
- 위 항목의 개발 상태 문구를 제품 화면에 노출하지 않는다.

## 디자인 시스템

- `src/styles/onnode.css`: OnNode primary/secondary/neutral/danger palette와 surface/text/border 의미 토큰. 기존 graph/editor 토큰은 삭제하지 않는다.
- `public/onnode/auth`: Figma 원본 SVG와 Google 아이콘. 화면 캡처를 배경으로 쓰지 않는다.
- `public/onnode/fonts`: 공식 Pretendard variable font와 OFL 라이선스. 인증 레이아웃에서만 `next/font/local`로 적용한다.
- 로그인 배경은 사용자 승인에 따라 Motion (`motion/react`, Framer Motion)으로 Figma 원본 keyframe을 적용한다. 기본 화면은 5.051초, 오류 화면은 2초의 공동 타임라인을 사용한다. 복구 화면은 정적 배경을 유지한다.
- `prefers-reduced-motion`에서는 반복 모션을 중단하고 캐릭터와 말풍선을 정적으로 표시한다. 위치 wrapper와 모션 wrapper를 분리하여 transform 충돌을 방지한다.
- Google 로고는 사용자 요청에 따라 배경 없는 공식 로고를 20×20으로 사용한다.

## 검증 항목

- 로그인 오류가 refresh 실패로 바뀌거나 페이지가 새로고침되지 않는지.
- 로그인 유지 / 미유지, refresh 회전, 로그아웃 저장 위치.
- 세션 복원 중 새 로그인 중복 제출 차단.
- 비밀번호 표시/숨김 키보드 접근, 라벨/입력 연결, 오류 live region.
- 회원가입 진입/복귀, 기존 이메일 인증 및 Google 로그인 흐름 보존.
- 비밀번호 복구 화면에서는 네트워크 호출/가짜 성공 상태가 없는지.
- 모든 로고/캐릭터 에셋 로딩과 디자인 슬롯 비율, 1280×800 및 작은 데스크톱 화면.
