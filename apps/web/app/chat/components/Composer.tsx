'use client';

import { useState } from 'react';

import { computeRows } from '../lib/auto-grow';
import { shouldSendOnEnter } from '../lib/keyboard';
import { useIsMobile } from '../lib/use-is-mobile';
import styles from '../chat.module.css';

const MAX_ROWS = 5;

export type ComposerProps = {
  streaming: boolean;
  onSend: (text: string) => void;
};

export function Composer({ streaming, onSend }: ComposerProps) {
  const [value, setValue] = useState('');
  const isMobile = useIsMobile();
  const platform = isMobile ? 'mobile' : 'desktop';
  const rows = computeRows(value, MAX_ROWS);
  const canSend = value.trim() !== '' && !streaming;

  const submit = () => {
    if (value.trim() === '' || streaming) return;
    onSend(value);
    setValue('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      shouldSendOnEnter(platform, {
        shift: event.shiftKey,
        isComposing: event.nativeEvent.isComposing,
      })
    ) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className={styles.composerWrap}>
      <div className={styles.composerRow}>
        <textarea
          className={styles.composer}
          value={value}
          rows={rows}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder="输入消息…"
          aria-label="消息输入"
          disabled={streaming}
        />
        <button
          type="button"
          className={styles.sendButton}
          onClick={submit}
          disabled={!canSend}
          aria-label="发送"
        >
          发送
        </button>
      </div>
    </div>
  );
}
