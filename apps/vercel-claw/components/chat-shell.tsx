"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { DEFAULT_INSTANCE_ID, type SettingRecord, type ThreadDetail, type ThreadMessage, type ThreadSummary } from "@vercel-claw/core";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageAvatar,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Response } from "@/components/ai-elements/response";

const STARTERS = [
  "Summarize the project and tell me what is missing for a real personal deployment.",
  "Plan a Convex schema for agents, threads, messages, artifacts, and settings.",
  "Create a Vercel-first roadmap for shipping this as a personal AI operator.",
];

export function ChatShell() {
  const [activeTab, setActiveTab] = useState<"chat" | "settings">("chat");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [settings, setSettings] = useState<SettingRecord[]>([]);
  const [settingDrafts, setSettingDrafts] = useState<Record<string, string>>({});
  const [sidebarNotice, setSidebarNotice] = useState<string | null>(null);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const viewportRef = useRef<HTMLDivElement>(null);
  const activeThreadIdRef = useRef<string | null>(null);
  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages }) => ({
        body: {
          threadId: activeThreadIdRef.current,
          surface: "web",
          messages: messages.map((message) => ({
            id: message.id,
            role: message.role === "assistant" || message.role === "system" ? message.role : "user",
            text: getMessageText(message),
          })),
        },
      }),
    }),
    onFinish: async () => {
      await refreshThreads();

      if (activeThreadIdRef.current) {
        await loadThread(activeThreadIdRef.current, false);
      }

      requestAnimationFrame(scrollToBottom);
    },
  });

  const isLoading = status === "streaming" || status === "submitted";
  const lastAssistantMessageId =
    [...messages].reverse().find((message) => message.role === "assistant")?.id ?? null;

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    void refreshThreads();
    void refreshSettings();
  }, []);

  function scrollToBottom() {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: "smooth",
    });
  }

  async function submitCurrentInput() {
    const value = input.trim();
    await submitText(value);
  }

  async function submitText(value: string) {
    if (!value || isLoading) {
      return;
    }

    setSidebarNotice(null);

    if (!activeThreadIdRef.current) {
      const thread = await createThread(value);
      if (!thread) {
        return;
      }

      setActiveThreadId(thread.id);
      activeThreadIdRef.current = thread.id;
    }

    setInput("");
    await sendMessage({ text: value });
    requestAnimationFrame(scrollToBottom);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitCurrentInput();
  }

  async function sendStarter(prompt: string) {
    if (isLoading) {
      return;
    }

    setActiveTab("chat");
    setInput(prompt);
    await submitText(prompt);
  }

  async function copyLastAssistantMessage() {
    const lastAssistant = [...messages]
      .reverse()
      .find((message) => message.role === "assistant");

    if (!lastAssistant) {
      return;
    }

    const text = lastAssistant.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n\n");

    if (!text) {
      return;
    }

    await navigator.clipboard.writeText(text);
  }

  async function refreshThreads() {
    setLoadingThreads(true);

    try {
      const response = await fetch(`/api/threads?instanceId=${DEFAULT_INSTANCE_ID}`);
      const payload = (await response.json()) as { threads?: ThreadSummary[]; error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load threads");
      }

      setThreads(payload.threads ?? []);
    } catch (loadError) {
      setSidebarNotice(loadError instanceof Error ? loadError.message : "Unable to load threads");
    } finally {
      setLoadingThreads(false);
    }
  }

  async function refreshSettings() {
    setLoadingSettings(true);

    try {
      const response = await fetch("/api/settings");
      const payload = (await response.json()) as { settings?: SettingRecord[]; error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load settings");
      }

      const nextSettings = payload.settings ?? [];
      setSettings(nextSettings);
      setSettingDrafts(
        Object.fromEntries(nextSettings.map((setting) => [setting.key, setting.value])),
      );
    } catch (loadError) {
      setSettingsNotice(loadError instanceof Error ? loadError.message : "Unable to load settings");
    } finally {
      setLoadingSettings(false);
    }
  }

  async function createThread(title: string) {
    try {
      const response = await fetch("/api/threads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          instanceId: DEFAULT_INSTANCE_ID,
          surface: "web",
        }),
      });

      const payload = (await response.json()) as { thread?: ThreadSummary; error?: string };

      if (!response.ok || !payload.thread) {
        throw new Error(payload.error || "Unable to create a thread");
      }

      await refreshThreads();
      return payload.thread;
    } catch (createError) {
      setSidebarNotice(createError instanceof Error ? createError.message : "Unable to create a thread");
      return null;
    }
  }

  async function loadThread(threadId: string, switchToChat = true) {
    try {
      const response = await fetch(`/api/threads/${threadId}`);
      const payload = (await response.json()) as ThreadDetail & { error?: string };

      if (!response.ok || !payload.thread) {
        throw new Error(payload.error || "Unable to load the selected thread");
      }

      setActiveThreadId(payload.thread.id);
      setMessages(payload.messages.map(toUiMessage));

      if (switchToChat) {
        setActiveTab("chat");
      }

      requestAnimationFrame(scrollToBottom);
    } catch (loadError) {
      setSidebarNotice(
        loadError instanceof Error ? loadError.message : "Unable to load the selected thread",
      );
    }
  }

  function startNewThread() {
    setActiveTab("chat");
    setActiveThreadId(null);
    activeThreadIdRef.current = null;
    setMessages([]);
    setInput("");
  }

  async function saveSetting(setting: SettingRecord) {
    const value = settingDrafts[setting.key] ?? "";

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scope: setting.scope,
          key: setting.key,
          label: setting.label,
          value,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || `Unable to save ${setting.label}`);
      }

      setSettingsNotice(`Saved ${setting.label}`);
      await refreshSettings();
    } catch (saveError) {
      setSettingsNotice(saveError instanceof Error ? saveError.message : "Unable to save the setting");
    }
  }

  return (
    <main className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">VC</div>
          <div>
            <p className="sidebar-label">Personal Agent</p>
            <h1>vercel-claw</h1>
          </div>
        </div>

        <nav className="sidebar-tabs" aria-label="Primary">
          <button
            type="button"
            className={`sidebar-tab ${activeTab === "chat" ? "sidebar-tab-active" : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            Chat
          </button>
          <button
            type="button"
            className={`sidebar-tab ${activeTab === "settings" ? "sidebar-tab-active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            Settings
          </button>
        </nav>

        <button type="button" className="starter-card" onClick={startNewThread}>
          Start a new thread
        </button>

        <div className="sidebar-section">
          <p className="sidebar-heading">Pinned prompts</p>
          <div className="starter-list">
            {STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                className="starter-card"
                onClick={() => void sendStarter(starter)}
              >
                {starter}
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-section">
          <p className="sidebar-heading">Recent threads</p>
          <div className="thread-list">
            {loadingThreads ? <span className="sidebar-empty">Loading threads...</span> : null}
            {!loadingThreads && threads.length === 0 ? (
              <span className="sidebar-empty">No stored threads yet.</span>
            ) : null}
            {threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                className={`thread-card ${thread.id === activeThreadId ? "thread-card-active" : ""}`}
                onClick={() => void loadThread(thread.id)}
              >
                <strong>{thread.title}</strong>
                <span>{thread.status}</span>
                <span className="thread-meta">
                  {thread.surface} surface
                  {thread.lastMessageAt ? ` • ${formatTimestamp(thread.lastMessageAt)}` : ""}
                </span>
              </button>
            ))}
            {sidebarNotice ? <span className="sidebar-empty">{sidebarNotice}</span> : null}
          </div>
        </div>

        <div className="sidebar-footer">
          <span className="sidebar-chip">Next.js</span>
          <span className="sidebar-chip">AI SDK v6</span>
          <span className="sidebar-chip">Convex</span>
        </div>
      </aside>

      <section className="chat-pane">
        <header className="chat-header">
          <div>
            <p className="sidebar-label">Workspace</p>
            <h2>{activeTab === "chat" ? "Operator chat" : "Settings"}</h2>
          </div>
          <div className="header-status">
            <span className={`status-dot ${isLoading ? "status-live" : "status-idle"}`} />
            <span>
              {activeTab === "chat" ? (isLoading ? "Streaming" : "Ready") : "Local config"}
            </span>
          </div>
        </header>

        {activeTab === "chat" ? (
          <>
            <Conversation>
              <ConversationContent ref={viewportRef}>
                {messages.length === 0 ? (
                  <ConversationEmptyState
                    title="Ask the agent to plan, scaffold, or review your deployment."
                    description="The website is a thin chat client on top of the app's shared API surface. Create a thread and the conversation is persisted in Convex for other surfaces to reuse."
                  >
                    <div className="empty-state-grid">
                      {STARTERS.map((starter) => (
                        <button
                          key={starter}
                          type="button"
                          className="empty-state-card"
                          onClick={() => void sendStarter(starter)}
                        >
                          {starter}
                        </button>
                      ))}
                    </div>
                  </ConversationEmptyState>
                ) : (
                  messages.map((message) => (
                    <Message
                      key={message.id}
                      from={
                        message.role === "assistant" || message.role === "system"
                          ? message.role
                          : "user"
                      }
                    >
                      <MessageAvatar
                        from={
                          message.role === "assistant" || message.role === "system"
                            ? message.role
                            : "user"
                        }
                      />
                      <div className="message-stack">
                        <MessageContent>
                          {message.parts.map((part, index) => {
                            if (part.type !== "text") {
                              return null;
                            }

                            return (
                              <MessageResponse key={`${message.id}-${index}`}>
                                <Response>{part.text}</Response>
                              </MessageResponse>
                            );
                          })}
                        </MessageContent>

                        {message.role === "assistant" && message.id === lastAssistantMessageId ? (
                          <MessageActions>
                            <MessageAction onClick={() => void copyLastAssistantMessage()}>
                              Copy reply
                            </MessageAction>
                          </MessageActions>
                        ) : null}
                      </div>
                    </Message>
                  ))
                )}
              </ConversationContent>

              {messages.length > 0 ? (
                <ConversationScrollButton onClick={scrollToBottom}>
                  Jump to latest
                </ConversationScrollButton>
              ) : null}
            </Conversation>

            <footer className="composer-shell">
              {error ? <p className="composer-error">{error.message}</p> : null}

              <PromptInput onSubmit={(event) => void handleSubmit(event)}>
                <PromptInputTextarea
                  value={input}
                  placeholder="Ask vercel-claw to plan a feature, review a repo, or scaffold the next step…"
                  onChange={(event) => setInput(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void submitCurrentInput();
                    }
                  }}
                />
                <div className="composer-actions">
                  <p className="composer-hint">Enter sends. Shift+Enter adds a newline.</p>
                  <PromptInputSubmit disabled={isLoading || input.trim().length === 0}>
                    {isLoading ? "Thinking…" : "Send"}
                  </PromptInputSubmit>
                </div>
              </PromptInput>
            </footer>
          </>
        ) : (
          <section className="settings-pane">
            <div className="settings-grid">
              <article className="settings-card">
                <p className="sidebar-heading">Model</p>
                <div className="settings-list">
                  {loadingSettings ? <span className="sidebar-empty">Loading settings...</span> : null}
                  {settings.map((setting) => (
                    <div key={setting.id} className="settings-editor">
                      <div className="settings-editor-header">
                        <span>{setting.label}</span>
                        <button
                          type="button"
                          className="settings-save-button"
                          onClick={() => void saveSetting(setting)}
                        >
                          Save
                        </button>
                      </div>
                      {setting.key === "model.systemPrompt" ? (
                        <textarea
                          className="settings-textarea"
                          value={settingDrafts[setting.key] ?? ""}
                          onChange={(event) =>
                            setSettingDrafts((current) => ({
                              ...current,
                              [setting.key]: event.currentTarget.value,
                            }))
                          }
                        />
                      ) : (
                        <input
                          className="settings-input"
                          value={settingDrafts[setting.key] ?? ""}
                          onChange={(event) =>
                            setSettingDrafts((current) => ({
                              ...current,
                              [setting.key]: event.currentTarget.value,
                            }))
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              </article>

              <article className="settings-card">
                <p className="sidebar-heading">State</p>
                <div className="settings-list">
                  <div className="settings-row">
                    <span>Active thread</span>
                    <strong>{activeThreadId ?? "No thread selected"}</strong>
                  </div>
                  <div className="settings-row">
                    <span>Stored threads</span>
                    <strong>{threads.length}</strong>
                  </div>
                  <div className="settings-row">
                    <span>Chat runtime</span>
                    <strong>Next.js + Convex</strong>
                  </div>
                </div>
              </article>
            </div>

            <article className="settings-card settings-card-wide">
              <p className="sidebar-heading">Environment</p>
              <div className="settings-list">
                <div className="settings-row">
                  <span>OpenAI API key</span>
                  <strong>Configured in server env</strong>
                </div>
                <div className="settings-row">
                  <span>Convex URL</span>
                  <strong>
                    {process.env.NEXT_PUBLIC_CONVEX_URL || "Missing NEXT_PUBLIC_CONVEX_URL"}
                  </strong>
                </div>
                <div className="settings-row">
                  <span>Instance</span>
                  <strong>{DEFAULT_INSTANCE_ID}</strong>
                </div>
              </div>
              {settingsNotice ? <p className="settings-banner">{settingsNotice}</p> : null}
            </article>
          </section>
        )}
      </section>
    </main>
  );
}

function toUiMessage(message: ThreadMessage): UIMessage {
  return {
    id: message.id,
    role: message.role === "tool" ? "assistant" : message.role,
    parts: [{ type: "text", text: message.content }],
  };
}

function getMessageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n\n");
}

function formatTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}
