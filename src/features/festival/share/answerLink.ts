'use client';

/*
 * CONTEXT
 * - Problem      : 답변마다 고유한 공유 링크가 필요하고, 그 링크는 인스타 DM으로 전달된 뒤
 *                  언제 열려도 살아있어야 한다. 지금 프론트에는 저장소가 없다.
 * - Why          : 답변 본문을 압축해 URL 해시(#)에 담는다. 해시는 서버로 전송되지 않아
 *                  사용자 답변이 서버 로그에 남지 않고, 저장소가 없으니 만료도 유실도 없다.
 *                  경로의 UUID는 링크를 사람마다 구분하고 나중에 유입을 나눠 보기 위한 것.
 * - Alternatives : (1) 서버 저장 + 짧은 id — 백엔드 API·DB가 필요하고 데이터 수명 관리가 붙는다
 *                  (2) 쿼리스트링(?c=) — 서버 로그·리퍼러에 답변이 남아 기각
 *                  (3) localStorage — 링크를 받은 다른 기기에서 열리지 않아 기각
 * - Trade-offs   : URL이 길어진다(한국어 500자 기준 압축 후 700~900자). DM 링크는 클릭만
 *                  하면 되므로 길이보다 영속성을 택했다.
 * - Edge Case    : CompressionStream이 없는 브라우저에서는 압축 없이 담는다. 버전 접두사로
 *                  두 형식을 구분해 어느 쪽으로 만든 링크든 열린다.
 *                  카드에 찍히는 날짜는 "링크를 만든 날"이어야 한다. 열람 시점의 new Date()를
 *                  쓰면 축제 다음 주에 연 사람에게는 엉뚱한 날짜가 보이므로 해시에 함께 싣는다.
 */

/** 압축 없이 담은 payload. */
const PLAIN_PREFIX = '1';
/** deflate-raw로 압축해 담은 payload. */
const DEFLATE_PREFIX = '2';

export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

// CompressionStream / DecompressionStream은 writable이 BufferSource라 Uint8Array 스트림 타입과
// 정확히 맞지 않는다. 둘 다 받는 형태로 받아 넘긴다.
type ByteTransform = ReadableWritablePair<Uint8Array, BufferSource>;

async function pipeThrough(bytes: Uint8Array, stream: ByteTransform) {
  const blob = new Blob([bytes as BlobPart]);
  const response = new Response(blob.stream().pipeThrough(stream));
  return new Uint8Array(await response.arrayBuffer());
}

/** 답변 본문 → URL 해시에 넣을 문자열. */
export async function encodeAnswer(content: string): Promise<string> {
  const bytes = new TextEncoder().encode(content);
  if (typeof CompressionStream === 'undefined') {
    return PLAIN_PREFIX + toBase64Url(bytes);
  }
  try {
    const deflated = await pipeThrough(bytes, new CompressionStream('deflate-raw'));
    return DEFLATE_PREFIX + toBase64Url(deflated);
  } catch {
    return PLAIN_PREFIX + toBase64Url(bytes);
  }
}

/** URL 해시 문자열 → 답변 본문. 열 수 없으면 null (링크가 잘렸거나 형식이 다른 경우). */
export async function decodeAnswer(payload: string): Promise<string | null> {
  if (!payload) return null;
  const prefix = payload.slice(0, 1);
  const body = payload.slice(1);
  if (!body) return null;

  try {
    const bytes = fromBase64Url(body);
    if (prefix === PLAIN_PREFIX) return new TextDecoder().decode(bytes);
    if (prefix === DEFLATE_PREFIX) {
      if (typeof DecompressionStream === 'undefined') return null;
      const inflated = await pipeThrough(bytes, new DecompressionStream('deflate-raw'));
      return new TextDecoder().decode(inflated);
    }
    return null;
  } catch {
    return null;
  }
}

const pad = (value: number) => String(value).padStart(2, '0');

/** 링크에 싣는 날짜 도장. 예) 2026-08-29 → `20260829` */
export function formatDateStamp(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

/** 날짜 도장 → Date. 형식이 아니면 null. */
export function parseDateStamp(stamp: string): Date | null {
  if (!/^\d{8}$/.test(stamp)) return null;
  const year = Number(stamp.slice(0, 4));
  const month = Number(stamp.slice(4, 6));
  const day = Number(stamp.slice(6, 8));
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  // 2월 30일처럼 굴러 넘어간 값은 걸러낸다.
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

/**
 * 공유 링크 해시(`#20260829.2AbC...`)를 날짜와 payload로 가른다.
 * 날짜가 없는 옛 형식이나 잘린 링크도 payload만 살려 최대한 열어준다.
 */
export function parseShareHash(hash: string): { createdAt: Date | null; payload: string } {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const separator = raw.indexOf('.');
  if (separator === -1) return { createdAt: null, payload: raw };
  return {
    createdAt: parseDateStamp(raw.slice(0, separator)),
    payload: raw.slice(separator + 1),
  };
}

/** 답변 하나에 대한 공유 링크. 경로의 UUID가 링크를 사람마다 구분한다. */
export async function buildAnswerShareUrl(content: string, origin: string, createdAt: Date): Promise<string> {
  const id = crypto.randomUUID();
  return `${origin}/festival/${id}#${formatDateStamp(createdAt)}.${await encodeAnswer(content)}`;
}
