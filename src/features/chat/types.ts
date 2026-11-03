export type ChatRole = 'assistant' | 'user';

/** 답변 근거 — 서버가 출처를 돌려주기 시작하면 채운다. 없으면 출처 영역은 그리지 않는다 */
export interface ChatSources {
  nodes: { id: string; title: string }[];
  webs: { title: string; host: string; url: string }[];
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** 답변이 읽은 노드 수 — 메타 줄에 표시 */
  nodeCount?: number;
  /** 답변이 어떤 질문에 대한 것인지 — 노드로 저장할 때 제목으로 쓴다 */
  question?: string;
  /** 답변이 근거로 삼은 범위의 루트 노드 — 노드로 저장할 때 이 노드 아래에 만든다 */
  rootId?: string;
  sources?: ChatSources;
  /** 노드로 저장한 뒤 생성된 노드 id */
  savedNodeId?: string;
}

export type ChatStatus = 'empty' | 'sending' | 'ready' | 'error';
