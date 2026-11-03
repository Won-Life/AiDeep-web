# 삭제한 코드 기록

쓰이지 않아 지운 코드를 모아 두는 문서다. 지운 이유, 마지막으로 있던 커밋, 되살리는 방법을 적는다.
git 이력에 모두 남아 있으므로 파일을 다시 쓸 필요는 없다.

---

## 2026-11-04 · ChipHeader 계열 6개 파일 (약 1,290줄)

| 파일 | 줄 수 | 하던 일 |
|---|---|---|
| `components/layout/ChipHeader.tsx` | 249 | 상단 헤더: PROJECT 노드 chip, 협업자, 유저 메뉴, 공유 |
| `components/layout/UserMenu.tsx` | 470 | 이름·이메일 드롭다운, 닉네임 수정, 프로필 사진 업로드, 설정·보관함·로그아웃 |
| `components/layout/ShareButton.tsx` | 88 | 워크스페이스 초대 링크 생성 버튼 |
| `components/layout/CollaboratorsList.tsx` | 154 | presence 기반 접속자 아바타 목록 |
| `components/layout/MembersModal.tsx` | 165 | 멤버 목록 모달(백엔드 미구현 placeholder였음) |
| `components/layout/OnboardingPopup.tsx` | 165 | 첫 진입 온보딩 팝업 |

### 왜 지웠나
- 2026-10-08 커밋 `78ed1b3`("상단 ChipHeader 제거")에서 레이아웃이 `ChipHeader`를 더 이상 쓰지 않게 됐다. 파일만 남아 있었다.
- 이후 4주간 `ChipHeader`를 import 하는 곳이 없었고, 나머지 5개 파일은 `ChipHeader`에서만 쓰였다(`ShareButton`, `CollaboratorsList`, `UserMenu`, `OnboardingPopup`은 직접, `MembersModal`은 `CollaboratorsList`를 통해).
- `UserMenu`의 프로필·설정·보관함·로그아웃은 사이드바 `ProfileRow`(`components/layout/Sidebar.tsx`)가 대신하고 있다. 닉네임·프로필 사진 수정은 `features/settings/`(`NicknameModal`, `ProfilePhotoModal`)가 맡는다.

### 마지막으로 이 파일들이 있던 커밋
`e1a201e` (`refactor(ui): 첫 글자 칩을 LetterChip 으로 통합`). 로컬 태그 `archive/chipheader-family` 가 같은 커밋을 가리킨다.

### 되살리는 방법
전체:

```bash
git checkout archive/chipheader-family -- src/components/layout/ChipHeader.tsx src/components/layout/UserMenu.tsx src/components/layout/ShareButton.tsx src/components/layout/CollaboratorsList.tsx src/components/layout/MembersModal.tsx src/components/layout/OnboardingPopup.tsx
```

하나만(예: 공유 버튼):

```bash
git checkout archive/chipheader-family -- src/components/layout/ShareButton.tsx
```

태그가 없는 환경에서는 `archive/chipheader-family` 대신 `e1a201e` 를 쓴다.

### 되살릴 때 알아둘 것
- 초대 API(`inviteToWorkspace`, `src/api/workspace.ts`)와 타입은 지우지 않았다. `ShareButton`이 쓰던 것이다.
- `ChipHeader`가 레이아웃에서 빠진 뒤 사이드바 폭·도크 에디터 레이아웃이 바뀌었으므로, 다시 붙이려면 `app/workspace/layout.tsx`의 배치부터 다시 맞춰야 한다.
- 사이드바 프로필(`ProfileRow`)과 같은 기능이 있었던 `UserMenu`는 되살리지 말고 `ProfileRow`로 합치는 편이 낫다.
- `docs/ARCHITECTURE.md`·`docs/PRD.md`·`docs/ADR.md`(ADR-015)의 ChipHeader 설명은 과거 기록으로 남겨 두었다. 파일 트리 목록에서만 뺐다.
