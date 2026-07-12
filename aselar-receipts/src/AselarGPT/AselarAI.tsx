import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./AselarAI.module.css";
import { useAselarAI } from "../Hooks/useAselarAI";

// ── Icons (inline SVGs — no extra deps) ─────────────────
const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IconSend = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const IconStop = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);
const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);
const IconChat = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconSparkle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
  </svg>
);

// ── Suggestion chips shown on empty state ────────────────
const SUGGESTIONS = [
  "What's a break-even analysis?",
  "Calculate 23% profit margin on P5,400",
  "Explain double-entry bookkeeping",
  "Draft a payment reminder for overdue invoice",
  "What's the difference between cash and accrual accounting?",
  "How do I calculate employee tax in Botswana?",
];

// ── Typing indicator ─────────────────────────────────────
const TypingDots = () => (
  <div className={styles.typingDots}>
    <span /><span /><span />
  </div>
);

// ── Single message bubble ─────────────────────────────────
const MessageBubble = ({ 
  role, 
  content, 
  regenerateLast, 
  isStreaming 
}: { 
  role: string; 
  content: string; 
  regenerateLast: () => void;
  isStreaming: boolean;
}) => {
  const isUser = role === "user";

  return (
    <div className={`${styles.messageRow} ${isUser ? styles.messageRowUser : styles.messageRowAI}`}>
      {!isUser && (
        <div className={styles.avatar}>
          <IconSparkle />
        </div>
      )}
      <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAI}`}>
        {content || <TypingDots />}
      </div>

      {/* Regenerate button - only on last assistant message */}
      {!isUser && content && !isStreaming && (
        <button
          onClick={regenerateLast}
          className="ml-3 text-xs text-gray-400 hover:text-blue-600 transition-colors self-start mt-1"
          title="Regenerate this response"
        >
          ↻ Regenerate
        </button>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────
export default function AselarAI() {
 const {
  sessions, activeSessionId, messages,
  isStreaming, isLoading, error,
  sendMessage, stopStreaming,
  newSession, loadSession, deleteSession,
  regenerateLast,
} = useAselarAI();

  const [input, setInput] = useState("");

  // FIX: sidebar now starts closed on mobile and open on desktop,
  // instead of always starting true (which covered the whole screen on mobile).
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth > 768;
    }
    return true;
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
  };

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    sendMessage(trimmed);
  }, [input, isStreaming, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (text: string) => {
    sendMessage(text);
  };

  // FIX: helper so mobile auto-closes the overlay after these actions,
  // instead of leaving it open and blocking the chat/input.
  const closeSidebarOnMobile = () => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  const handleNewSession = () => {
    newSession();
    closeSidebarOnMobile();
  };

  const handleLoadSession = (id: string) => {
    loadSession(id);
    closeSidebarOnMobile();
  };

  const isEmpty = messages.length === 0;

  return (
    <div className={styles.root}>
      {/* ── Sidebar ── */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>Chat History</span>
          <button className={styles.newChatBtn} onClick={handleNewSession} title="New chat">
            <IconPlus />
          </button>
        </div>

        <div className={styles.sessionList}>
          {sessions.length === 0 && (
            <p className={styles.noSessions}>No chats yet. Start a conversation!</p>
          )}
          {sessions.map((s) => (
            <div
              key={s._id}
              className={`${styles.sessionItem} ${activeSessionId === s._id ? styles.sessionItemActive : ""}`}
              onClick={() => handleLoadSession(s._id)}
            >
              <div className={styles.sessionIcon}><IconChat /></div>
              <div className={styles.sessionMeta}>
                <span className={styles.sessionTitle}>{s.title}</span>
                <span className={styles.sessionDate}>
                  {new Date(s.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </div>
              <button
                className={styles.deleteBtn}
                onClick={(e) => { e.stopPropagation(); deleteSession(s._id); }}
                title="Delete"
              >
                <IconTrash />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* FIX: backdrop that closes the sidebar when tapped, only relevant/visible on mobile via CSS */}
      {sidebarOpen && (
        <div className={styles.sidebarBackdrop} onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main chat area ── */}
      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <button className={styles.toggleBtn} onClick={() => setSidebarOpen((v) => !v)} title="Toggle history">
            <span /><span /><span />
          </button>
          <div className={styles.headerTitle}>
            <div className={styles.headerIcon}><IconSparkle /></div>
            <h1>Aselar <span>AI</span></h1>
            <span className={styles.badge}>NEW</span>
          </div>
          <button className={styles.newChatBtnHeader} onClick={handleNewSession}>
            <IconPlus /> New Chat
          </button>
        </header>

        {/* Messages */}
        <div className={styles.messagesArea}>
          {isLoading && (
            <div className={styles.loadingOverlay}>
              <TypingDots />
            </div>
          )}

          {isEmpty && !isLoading && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}><IconSparkle /></div>
              <h2>How can I help your business today?</h2>
              <p>Ask me anything about accounting, finance, invoicing, or business strategy.</p>
              <div className={styles.suggestions}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} className={styles.suggestionChip} onClick={() => handleSuggestion(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

         {!isEmpty && messages.map((msg, i) => (
  <MessageBubble 
    key={i} 
    role={msg.role} 
    content={msg.content} 
    regenerateLast={regenerateLast}
    isStreaming={isStreaming}
  />
))}

          {error && (
            <div className={styles.errorBanner}>{error}</div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className={styles.inputArea}>
          <div className={styles.inputWrapper}>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              placeholder="Ask about accounting, business, finance or do a calculation..."
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isStreaming}
            />
            <button
              className={`${styles.sendBtn} ${isStreaming ? styles.sendBtnStop : ""}`}
              onClick={isStreaming ? stopStreaming : handleSend}
              disabled={!isStreaming && !input.trim()}
              title={isStreaming ? "Stop" : "Send"}
            >
              {isStreaming ? <IconStop /> : <IconSend />}
            </button>
          </div>
          <p className={styles.disclaimer}>
            Aselar AI can make mistakes. Verify important financial and legal information.
          </p>
        </div>
      </main>
    </div>
  );
}