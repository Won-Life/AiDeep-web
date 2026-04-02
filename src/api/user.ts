import client from './client';

export async function getMe<T = unknown>(): Promise<T> {
  const { data } = await client.get<T>('/user/me');
  return data;
}

export async function updateUsername(username: string): Promise<void> {
  await client.patch('/user/me', { username });
}
