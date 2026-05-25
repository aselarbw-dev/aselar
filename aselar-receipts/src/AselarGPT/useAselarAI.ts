// hooks/useAselarAI.ts
// Handles session creation, streaming, and persistent history from MongoDB

import { useState, useCallback, useRef, useEffect } from "react";

const API_BASE = "http://localhost:5000/api";

export interface Message {
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
}

export interface ChatSession {
  _id: string;
  title: string;
  updatedAt: string;
}

export function useAselarAI() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_BASE}/chat/sessions`, { credentials: "include" });
      if (!res.ok) return;
      setSessions(await res.json());
    } catch (err) { console.error("Failed to fetch sessions:", err); }
  };

  const newSession = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/chat/session`, {
        method: "POST", credentials: "include",
      });
      const data = await res.json();
      setActiveSessionId(data.sessionId);
      setMessages([]);
      setSessions((prev) => [
        { _id: data.sessionId, title: "New Chat", updatedAt: new Date().toISOString() },
        ...prev,
      ]);
      return data.sessionId as string;
    } catch { return null; }
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    setIsLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/chat/session/${sessionId}`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setActiveSessionId(sessionId);
      setMessages(data.messages);
    } catch { setError("Failed to load chat history."); }
    finally { setIsLoading(false); }
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    await fetch(`${API_BASE}/chat/session/${sessionId}`, {
      method: "DELETE", credentials: "include",
    });
    setSessions((prev) => prev.filter((s) => s._id !== sessionId));
    if (activeSessionId === sessionId) { setActiveSessionId(null); setMessages([]); }
  }, [activeSessionId]);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || isStreaming) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = await newSession();
      if (!sessionId) { setError("Could not create a chat session."); return; }
    }

    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    setIsStreaming(true);
    abortRef.current = new AbortController();

    try {
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",  // ← cookie sent automatically
        body: JSON.stringify({ message: userMessage, sessionId }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error("Network error");

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) { setError(data.error); break; }
            if (data.done) break;
            if (data.content) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + data.content,
                };
                return updated;
              });
            }
          } catch { /* skip */ }
        }
      }
      fetchSessions(); // refresh sidebar titles
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError("Connection failed. Is the backend running?");
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [activeSessionId, isStreaming, newSession]);

  const stopStreaming = useCallback(() => { abortRef.current?.abort(); }, []);

  return {
    sessions, activeSessionId, messages,
    isStreaming, isLoading, error,
    sendMessage, stopStreaming,
    newSession, loadSession, deleteSession,
  };
}