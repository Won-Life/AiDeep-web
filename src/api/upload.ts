import client from './client';
import type { UploadResponse } from './types';

// 서버 POST /upload는 multipart에 file + workspaceId(UUID, 필수)를 요구하고,
// 워크스페이스 멤버십(VIEWER 제외)을 검증한다. workspaceId 누락 시 400으로 거부된다.
export async function uploadFile(
  file: File,
  workspaceId: string,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('workspaceId', workspaceId);

  const { data } = await client.post<UploadResponse>('/upload', formData);
  return data;
}

export async function uploadMany(files: File[]): Promise<UploadResponse[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const { data } = await client.post<UploadResponse[]>('/upload/many', formData);
  return data;
}
