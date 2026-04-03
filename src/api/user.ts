import client from './client';
import type { UserMeResponse } from './types';

export async function getMe(): Promise<UserMeResponse> {
  const { data } = await client.get<UserMeResponse>('/user/me');
  return data;
}

export async function updateUsername(username: string): Promise<void> {
  await client.patch('/user/me', { username });
}
