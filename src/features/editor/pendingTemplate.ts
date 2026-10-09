import { isContentTemplateId, type ContentTemplateId } from './contentTemplates';

const STORAGE_KEY = 'onnode_pending_templates';
const pending = new Map<string, ContentTemplateId>();

function readStored(): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function writeStored(values: Record<string, unknown>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    /* 저장소를 못 써도 현재 탭의 메모리 값으로 동작한다. */
  }
}

/*
 * CONTEXT
 * - Problem      : 에디터 본문은 협업 문서에서만 채워져, 노드를 만드는 순간 REST로 템플릿을 넣을 수 없다.
 * - Why          : 만든 사람의 클라이언트가 "이 노드는 이 템플릿으로 시작"을 기억했다가 에디터가 처음 열릴 때 한 번 넣는다.
 * - Alternatives : 모든 클라이언트가 빈 문서에 삽입 → 두 사람이 동시에 열면 템플릿이 중복된다.
 * - Trade-offs   : 만든 탭의 기억에 의존하므로 노드를 열기 전에 탭을 닫으면 빈 노드로 남는다.
 * - Edge Case    : 새로고침은 sessionStorage로 버티고, 저장 불가 환경은 메모리만 쓰며, 꺼낸 값은 지운다.
 */
export function setPendingTemplate(nodeId: string, templateId: ContentTemplateId) {
  pending.set(nodeId, templateId);
  writeStored({ ...readStored(), [nodeId]: templateId });
}

export function takePendingTemplate(nodeId: string): ContentTemplateId | null {
  const stored = readStored();
  const value = pending.get(nodeId) ?? stored[nodeId];
  pending.delete(nodeId);
  if (nodeId in stored) {
    delete stored[nodeId];
    writeStored(stored);
  }
  return isContentTemplateId(value) ? value : null;
}
