'use client';

import { useEffect, useRef } from 'react';

import { isNearBottom } from '../lib/auto-stick';
import { cn } from '../lib/cn';
import { safeErrorMessage } from '../lib/error-messages';
import type { ChatSessionMessage } from '../lib/use-chat-session';
import styles from '../chat.module.css';

const THRESHOLD = 80;

export type MessageListProps = {
  messages: ChatSessionMessage[];
};

export function MessageList({ messages }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (el === null) return;
    stickRef.current = isNearBottom(
      el.scrollTop,
      el.clientHeight,
      el.scrollHeight,
      THRESHOLD,
    );
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el !== null && stickRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className={styles.messages}
      onScroll={handleScroll}
      role="log"
      aria-live="polite"
    >
      {messages.length === 0 ? (
        <p className={styles.emptyHint}>开始和 AI 聊天吧。</p>
      ) : (
        messages.map((message) => (
          <MessageRow key={message.id} message={message} />
        ))
      )}
    </div>
  );
}

function MessageRow({ message }: { message: ChatSessionMessage }) {
  if (message.status === 'error') {
    return (
      <div className={cn(styles.msg, styles.msgError)} role="alert">
        {safeErrorMessage(message.errorCode)}
      </div>
    );
  }
  // mw = mindweft，AI 消息的发送方标签。
  const label = message.role === 'user' ? '你' : 'mw';
  const body =
    message.content === '' && message.status === 'streaming'
      ? '…'
      : message.content;
  return (
    <div
      className={cn(
        styles.msg,
        message.role === 'user' ? styles.msgUser : styles.msgAssistant,
      )}
    >
      <div className={styles.msgLabel}>{label}</div>
      <span className={styles.msgContent}>{body}</span>
    </div>
  );
}
