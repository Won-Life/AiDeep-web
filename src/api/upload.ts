import client from './client';
import type { UploadResponse } from './types';

/*
 * CONTEXT
 * - Problem      : axios 1.13은 인스턴스 기본 헤더가 application/json이면 FormData를
 *                  JSON.stringify해 보낸다 — File이 {}로 직렬화되어 서버에 파일이 도착하지 않았다.
 * - Why          : 요청별로 multipart/form-data를 명시하면 axios가 FormData를 그대로
 *                  xhr.send에 넘기고 브라우저가 boundary를 붙여 직렬화한다 (실측 검증).
 * - Alternatives : 인스턴스 기본 Content-Type 제거 → 모든 JSON 요청 직렬화 방식에 영향.
 * - Trade-offs   : FormData를 보내는 함수마다 헤더 한 줄을 명시해야 한다.
 * - Edge Case    : 401 refresh 재시도 경로에서도 같은 config로 재전송되므로 동일하게 동작.
 */
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

// 서버 POST /upload는 multipart에 file + workspaceId(UUID, 필수)를 요구하고,
// 워크스페이스 멤버십(VIEWER 제외)을 검증한다. workspaceId 누락 시 400으로 거부된다.
export async function uploadFile(
  file: File,
  workspaceId: string,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('workspaceId', workspaceId);

  const { data } = await client.post<UploadResponse>('/upload', formData, MULTIPART);
  return data;
}

export async function uploadMany(files: File[]): Promise<UploadResponse[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const { data } = await client.post<UploadResponse[]>('/upload/many', formData, MULTIPART);
  return data;
}
