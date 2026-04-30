# API 클라이언트 구조

## 이 폴더가 하는 일

Next.js의 API Routes가 아닙니다. 외부 백엔드 서버를 호출하는 **클라이언트 사이드 HTTP 유틸 함수 모음**이에요.

```
브라우저에서 getMe() 호출
  → client.ts의 Axios 인스턴스 → /api/user/me 요청
  → Next.js rewrites (next.config.ts) → 외부 백엔드 서버로 포워딩
  → 응답 반환
```

---

## 데이터 페칭 전략

### 왜 Server Component + fetch를 쓰지 않나

이 앱의 핵심 데이터(노드, 엣지)는 WebSocket으로 실시간 동기화됩니다.
Server Component에서 초기 fetch를 해도 WebSocket 연결 직후 덮어씌워지므로 SSR의 이점이 없어요.
또한 캔버스·에디터·드래그 등 모든 인터랙션이 `'use client'` 필수여서
이미 클라이언트 컴포넌트 트리에 있는 상황입니다.

### 왜 SWR / TanStack Query를 쓰지 않나

두 라이브러리의 핵심 이점은 캐싱·중복 요청 제거·백그라운드 리패치입니다.

- **그래프 데이터(노드·엣지)**: WebSocket이 단일 데이터 소스. HTTP 캐싱 레이어가 개입할 여지 없음.
- **1회성 REST 호출(getMe, getWorkspaces 등)**: 세션 동안 단 한 번만 실행되므로
  캐시해서 재사용할 상황 자체가 없음.

서비스의 대부분 데이터가 위 두 케이스에 해당하므로 외부 라이브러리를 도입하지 않습니다.

> 향후 REST 기반 페이지(마이페이지, 설정 등)가 추가될 경우 SWR 도입을 재검토할 수 있습니다.

---

## 파일 구조

| 파일 | 역할 |
|------|------|
| `client.ts` | Axios 인스턴스. JWT 자동 첨부, 401 시 토큰 갱신 큐 처리 |
| `types.ts` | API 응답 envelope 타입 및 도메인 타입 전체 |
| `auth.ts` | 로그인·회원가입·로그아웃·토큰 갱신 |
| `user.ts` | 내 정보 조회·수정 |
| `workspace.ts` | 워크스페이스 목록 조회 |
| `node.ts` | 노드 CRUD |
| `edge.ts` | 엣지 생성·삭제 |
| `ws.ts` | WebSocket 이벤트 타입 정의 및 소켓 연결 |
| `upload.ts` | 파일 업로드 |
| `index.ts` | 전체 export 통합 |
