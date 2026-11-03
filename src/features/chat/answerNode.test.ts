import { describe, expect, it } from 'vitest';
import { answerNodeBody, answerNodeTitle } from './answerNode';

describe('answerNodeTitle', () => {
  it('질문 앞에 "AI ·" 를 붙인다', () => {
    expect(answerNodeTitle('결정 안 된 게 뭐야?')).toBe('AI · 결정 안 된 게 뭐야?');
  });

  it('길면 30자에서 줄임표로 자르고 공백은 한 칸으로 합친다', () => {
    const title = answerNodeTitle(`가${' '.repeat(3)}${'나'.repeat(40)}`);
    expect(title).toBe(`AI · 가 ${'나'.repeat(27)}…`);
  });

  it('빈 질문이면 "답변"', () => {
    expect(answerNodeTitle('   ')).toBe('AI · 답변');
  });
});

describe('answerNodeBody', () => {
  it('줄마다 문단이 되고 빈 줄은 빈 문단이 된다', () => {
    const { markdownBody, jsonBody } = answerNodeBody('첫째\n\n셋째\n');
    expect(markdownBody).toBe('첫째\n\n셋째');
    const children = JSON.parse(jsonBody).root.children;
    expect(children.map((paragraph: { children: { text: string }[] }) => paragraph.children[0]?.text ?? '')).toEqual(['첫째', '', '셋째']);
    expect(children.every((paragraph: { type: string }) => paragraph.type === 'paragraph')).toBe(true);
  });
});
