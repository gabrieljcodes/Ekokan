import { useEffect, useState } from 'react';

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

/**
 * Renders a stack of auto-dismissing toast notifications.
 * Mount once near the app root (e.g. in Layout).
 */
export default function ToastContainer() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (msg: ToastMessage) => {
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      }, 4500);
    };
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((fn) => fn !== handler);
    };
  }, []);

  if (messages.length === 0) return null;

  return (
    <div className="toast-container" aria-live="assertive" aria-atomic="false">
      {messages.map((msg) => (
        <div key={msg.id} className={`toast toast--${msg.type}`} role="alert">
          {msg.text}
        </div>
      ))}
    </div>
  );
}
