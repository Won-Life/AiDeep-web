import client from './client';

export async function getMe<T = unknown>(): Promise<T> {
  const { data } = await client.get<T>('/user/me');
  return data;
}
