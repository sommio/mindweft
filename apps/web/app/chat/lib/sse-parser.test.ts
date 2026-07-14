import { describe, expect, it } from 'vitest';

import { parseSseEvents } from './sse-parser';

describe('parseSseEvents', () => {
  it('parses delta and done events, no remainder', () => {
    const { events, remainder } = parseSseEvents(
      'data: {"delta":"你"}\n\ndata: [DONE]\n\n',
    );
    expect(events).toEqual([{ type: 'delta', delta: '你' }, { type: 'done' }]);
    expect(remainder).toBe('');
  });

  it('keeps incomplete tail as remainder', () => {
    const { events, remainder } = parseSseEvents('data: {"delta":"你"}\n');
    expect(events).toEqual([]);
    expect(remainder).toBe('data: {"delta":"你"}\n');
  });

  it('parses a mid-stream error event', () => {
    const { events, remainder } = parseSseEvents(
      'event: error\ndata: {"code":"provider_rejected"}\n\n',
    );
    expect(events).toEqual([{ type: 'error', code: 'provider_rejected' }]);
    expect(remainder).toBe('');
  });

  it('handles multiple deltas then partial', () => {
    const { events, remainder } = parseSseEvents(
      'data: {"delta":"a"}\n\ndata: {"delta":"b"}\n\ndata: {"delta":"c"}',
    );
    expect(events).toEqual([
      { type: 'delta', delta: 'a' },
      { type: 'delta', delta: 'b' },
    ]);
    expect(remainder).toBe('data: {"delta":"c"}');
  });

  it('ignores non-data lines without erroring', () => {
    const { events } = parseSseEvents(': comment\n\ndata: {"delta":"x"}\n\n');
    expect(events).toEqual([{ type: 'delta', delta: 'x' }]);
  });

  it('treats unparseable data as unknown event', () => {
    const { events } = parseSseEvents('data: not-json\n\n');
    expect(events).toEqual([{ type: 'unknown' }]);
  });
});
