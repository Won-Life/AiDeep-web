# 데모용 OpenAI 챗봇 설정

이 문서는 `feat/demo-chat-bot-bridge` 전용입니다. 실제 API 키는 저장소에 넣지 않고, 실행 환경의 `.env.local` 또는 배포 환경변수에만 설정합니다.

```dotenv
DEMO_OPENAI_CHAT_ENABLED=true
OPENAI_API_KEY=<데모 전용 OpenAI Project 키>
OPENAI_CHAT_MODEL=<승인한 OpenAI 모델 ID>
```

- `DEMO_OPENAI_CHAT_ENABLED`가 `true`가 아니면 Route는 `503`을 반환합니다.
- 데모 종료 후 키를 폐기하고, Bridge 커밋 또는 PR을 revert합니다.
- Route는 질문 500자, 그래프 컨텍스트 24,000자, 분당 12회, 응답 최대 500 토큰으로 제한합니다.
