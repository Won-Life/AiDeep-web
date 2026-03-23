import client from './client';
import type { UploadResponse } from './types';

export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await client.post<UploadResponse>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function uploadMany(files: File[]): Promise<UploadResponse[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const { data } = await client.post<UploadResponse[]>('/upload/many', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
