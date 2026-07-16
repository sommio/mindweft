import { describe, expect, it } from 'vitest';
import { bm25, rankCandidates, splitIntoChunks } from './index';

describe('memory algorithms', () => {
  it('splits only complete groups of ten and keeps stable boundaries', () => {
    const messages = Array.from({ length: 19 }, (_, i) => ({
      id: String(i),
      role: i % 2 ? ('assistant' as const) : ('user' as const),
      content: `消息${String(i)}`,
    }));
    expect(splitIntoChunks(messages)).toHaveLength(1);
    expect(splitIntoChunks(messages)[0]?.startMessageId).toBe('0');
    expect(splitIntoChunks(messages)[0]?.endMessageId).toBe('9');
  });
  it('retrieves Chinese exact terms with BM25 and stable tie breaks', () => {
    const scores = bm25('林晓 北京 2026', [
      '林晓住在北京，计划于2026年搬家',
      '小明喜欢音乐',
    ]);
    expect(scores[0]).toBeGreaterThan(scores[1] ?? 0);
    const ranked = rankCandidates(
      [
        {
          id: 'b',
          conversationId: 'x',
          startMessageId: '1',
          endMessageId: '2',
          summary: 'b',
          sourceText: 'b',
          vectorScore: 0.5,
          bm25Score: 1,
        },
        {
          id: 'a',
          conversationId: 'x',
          startMessageId: '1',
          endMessageId: '2',
          summary: 'a',
          sourceText: 'a',
          vectorScore: 0.5,
          bm25Score: 1,
        },
      ],
      'hybrid',
    );
    expect(ranked.map((x) => x.id)).toEqual(['a', 'b']);
  });
});
