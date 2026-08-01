import React, { useEffect, useState, useCallback, useRef } from 'react';
import { IconCheck, IconWarning, IconBolt, IconX } from './Icons';

export interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}

let toastId = 0;
let listeners: Array<(msg: ToastMessage) => void> = [];

/** Fire a toast from anywhere — no context provider needed. */
export function toast(text: string, type: ToastMessage['type'] = 'info') {
  const msg: ToastMessage = { id: ++toastId, text, type };
  listeners.forEach((fn) => fn(msg));
}

interface ToastItemProps {
  message: ToastMessage;
  onDismiss: (id: number) => void;
}

const ToastItem: React.FC<ToastItemProps> = React.memo(({ message, onDismiss }) => {
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef(4500);
  const startRef = useRef(Date.now());

  const clearCurrentTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const resumeTimer = useCallback(() => {
    clearCurrentTimer();
    startRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      onDismiss(message.id);
    }, remainingRef.current);
  }, [message.id, onDismiss]);

  const pauseTimer = useCallback(() => {
    clearCurrentTimer();
    const elapsed = Date.now() - startRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
  }, []);

  useEffect(() => {
    if (!isPaused) {
      resumeTimer();
    } else {
      pauseTimer();
    }
    return () => {
      clearCurrentTimer();
    };
  }, [isPaused, resumeTimer, pauseTimer]);

  const isError = message.type === 'error';

  return (
    <div
      className={`toast toast--${message.type} motion-arrive-row`}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <span className="toast__icon" aria-hidden={true}>
        {message.type === 'success' && <IconCheck size={18} />}
        {message.type === 'error' && <IconWarning size={18} />}
        {message.type === 'info' && <IconBolt size={18} />}
      </span>
      <span className="toast__text">{message.text}</span>
      <button
        type="button"
        className="toast__close-btn"
        onClick={() => onDismiss(message.id)}
        aria-label={`Dismiss ${message.type} notification`}
      >
        <IconX size={16} aria-hidden={true} />
      </button>
    </div>
  );
});

/**
 * Renders a stack of auto-dismissing toast notifications.
 * Mount once near the app root (e.g. in Layout).
 */
const ToastContainer: React.FC = React.memo(() => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    const handler = (msg: ToastMessage) => {
      if (isMountedRef.current) {
        setMessages((prev) => [...prev, msg]);
      }
    };
    listeners.push(handler);
    return () => {
      isMountedRef.current = false;
      listeners = listeners.filter((fn) => fn !== handler);
    };
  }, []);

  const handleDismiss = useCallback((id: number) => {
    if (isMountedRef.current) {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }
  }, []);

  if (messages.length === 0) return null;

  return (
    <div
      className="toast-container"
      role="region"
      aria-label="Application notifications"
    >
      {messages.map((msg) => (
        <ToastItem key={msg.id} message={msg} onDismiss={handleDismiss} />
      ))}
    </div>
  );
});

export default ToastContainer;
