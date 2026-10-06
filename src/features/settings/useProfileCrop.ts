'use client';
import { useEffect, useRef, useState } from 'react';
import { getCenterCrop, getProfileFileError } from './settingsRules';

/*
 * CONTEXT
 * - Problem      : 사진 UI의 확대 정도와 실제 업로드 이미지가 일치해야 한다.
 * - Why          : object-fit cover와 같은 중앙 정사각 crop을 canvas로 512px 출력한다.
 * - Alternatives : 원본 파일만 전송 → 화면에 선택한 crop이 저장되지 않는다.
 * - Trade-offs   : 드래그 재배치는 없는 중앙 crop/확대 방식이다.
 * - Edge Case    : 잘못된 형식/5MB/깨진 이미지/이미지 URL 및 bitmap 해제/언마운트.
 */
export function useProfileCrop() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  function selectFile(next?: File) {
    if (!next || lock.current) return;
    const message = getProfileFileError(next);
    setError(message);
    // 잘못된 파일을 선택하면 이전 사진이 대신 전송되지 않도록 초기화한다.
    setFile(null);
    setUrl(null);
    setZoom(1);
    if (message) return;
    setFile(next);
    setUrl(URL.createObjectURL(next));
  }
  async function apply(onApply: (image: Blob) => void) {
    if (!file || lock.current) return;
    lock.current = true;
    setPending(true);
    setError('');
    let bitmap: ImageBitmap | undefined;
    try {
      bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image',
      });
      if (
        !bitmap.width ||
        !bitmap.height ||
        bitmap.width * bitmap.height > 40_000_000
      )
        throw new Error('dimensions');
      const crop = getCenterCrop(bitmap.width, bitmap.height, zoom);
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('canvas');
      context.drawImage(
        bitmap,
        crop.x,
        crop.y,
        crop.side,
        crop.side,
        0,
        0,
        512,
        512,
      );
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (image) => (image ? resolve(image) : reject(new Error('encode'))),
          'image/png',
        ),
      );
      if (alive.current) onApply(blob);
    } catch {
      if (alive.current) {
        setError('사진을 읽지 못했어요. 다른 JPG, PNG 파일을 선택해주세요.');
        setFile(null);
        setUrl(null);
      }
    } finally {
      bitmap?.close();
      lock.current = false;
      if (alive.current) setPending(false);
    }
  }
  return { file, url, zoom, setZoom, error, pending, selectFile, apply };
}
