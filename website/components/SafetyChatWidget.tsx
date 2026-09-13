'use client';

import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircleHeart, Send, X, AlertTriangle } from 'lucide-react';
import { useMapStore } from '../store/useMapStore';

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SESSION_STORAGE_KEY = 'safepath_chat_session_id';

const SafetyChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [escalate, setEscalate] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isActionSheetOpen = useMapStore((s) => s.isActionSheetOpen);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem(SESSION_STORAGE_KEY) : null;
    if (stored) setSessionId(stored);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isOpen]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setIsSending(true);

    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/chat/messages`, {
        session_id: sessionId,
        message: trimmed,
      });
      const { session_id, reply, escalate: shouldEscalate } = res.data.data;
      setSessionId(session_id);
      if (typeof window !== 'undefined') sessionStorage.setItem(SESSION_STORAGE_KEY, session_id);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      if (shouldEscalate) setEscalate(true);
    } catch (err) {
      console.error('Failed to send chat message:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong reaching the assistant. Please try again, and make sure officials have been notified.' },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  // The map's mobile Directions/Report/Road Safety sheet renders inside the
  // map's own `position: fixed` panel, which always opens its own stacking
  // context — no z-index on this widget could ever be made to lose to that
  // sheet from outside it, so we hide the widget outright while it's open
  // instead of fighting stacking contexts.
  if (isActionSheetOpen) return null;

  return (
    <div
      // z-[1800]: Leaflet's own panes (tiles/markers/popups) use z-index up to
      // 700 and share this stacking context (no ancestor isolates them), so a
      // low z-index here would let the map tiles paint over this widget once
      // they load on pages where the map fills the screen — sit above the
      // map's own floating controls but below full-screen modals (z-[2000])
      // so those can still cover it when open.
      className="fixed z-[1800] flex flex-col items-end"
      style={{
        bottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
        right: 'calc(1.5rem + env(safe-area-inset-right))',
      }}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="glass-panel rounded-xl w-[340px] max-w-[90vw] h-[480px] max-h-[70vh] flex flex-col mb-3 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-theme-border flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-theme-fg text-sm">Safety Assistant</p>
                <p className="text-xs text-theme-fg-muted">Basic guidance only — not a substitute for professional medical care.</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-theme-fg-muted hover:text-theme-fg shrink-0">
                <X size={18} />
              </button>
            </div>

            {escalate && (
              <div className="mx-3 mt-3 flex items-start gap-2 rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-xs text-red-300">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>If this is a life-threatening emergency, call your local emergency number now. Officials will take over care when they arrive.</span>
              </div>
            )}

            <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-2">
              {messages.length === 0 && (
                <p className="text-xs text-theme-fg-muted">
                  Tell me what's happening (e.g. "someone is choking") and I'll share basic first-aid steps while help is on the way.
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'ml-auto bg-theme-accent text-white'
                      : 'mr-auto bg-theme-panel text-theme-fg'
                  }`}
                >
                  {m.content}
                </div>
              ))}
              {isSending && <p className="text-xs text-theme-fg-muted">Thinking…</p>}
            </div>

            <div className="p-3 border-t border-theme-border flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe the situation…"
                className="flex-1 bg-theme-panel border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-fg placeholder:text-theme-fg-muted focus:outline-none focus:border-theme-border-hover"
              />
              <button
                onClick={sendMessage}
                disabled={isSending || !input.trim()}
                className="p-2 rounded-lg bg-theme-accent text-white disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen((o) => !o)}
        className="glass-panel rounded-full p-4 text-theme-fg hover:text-theme-accent transition-colors"
        aria-label="Open safety assistant"
      >
        <MessageCircleHeart size={24} />
      </button>
    </div>
  );
};

export default SafetyChatWidget;
