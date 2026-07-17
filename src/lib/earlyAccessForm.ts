// 얼리액세스 신청 → Google Form (AiDeep for Google Meet 얼리액세스 신청, forms.gle/feUDhTAbsy9mNoZd7)
export const EARLY_ACCESS_FORM_ACTION =
  'https://docs.google.com/forms/d/e/1FAIpQLSc3tg4r6WO4zMFjh8kbHCBdcWjkQ1q90zTY3s-oDt5x1QfFCg/formResponse';
export const EARLY_ACCESS_EMAIL_ENTRY = 'entry.225956236';
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitEarlyAccessEmail(email: string): Promise<void> {
  // ponytail: Google Form은 CORS 응답을 안 주므로 no-cors(opaque) — 상태코드는 못 읽고
  // 네트워크 실패만 잡힌다. 백엔드 알림 API 생기면 그걸로 교체.
  await fetch(EARLY_ACCESS_FORM_ACTION, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ [EARLY_ACCESS_EMAIL_ENTRY]: email }).toString(),
  });
}
