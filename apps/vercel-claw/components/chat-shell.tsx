"use client";

import { useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
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

const SIDEBAR_THREADS = [
  {
    title: "Deployment Checklist",
    preview: "What still needs to happen before this feels like a real product?",
  },
  {
    title: "Convex Architecture",
    preview: "Design a state model for durable threads, tools, and artifacts.",
  },
  {
    title: "Toolkit Integrations",
    preview: "Map Notion, Google Workspace, Slack, and GitHub into the agent surface.",
  },
];

const SETTINGS_GROUPS = [
  {
    title: "Model",
    items: [
      { label: "Provider", value: "OpenAI via Vercel AI SDK" },
      { label: "Default model", value: "gpt-4.1-mini" },
      { label: "Runtime", value: "Next.js route handlers" },
    ],
  },
  {
    title: "State",
    items: [
      { label: "Threads", value: "Convex-backed next" },
      { label: "Artifacts", value: "Convex storage planned" },
      { label: "Deploy target", value: "Vercel personal install" },
    ],
  },
];

export function ChatShell() {
  const [activeTab, setActiveTab] = useState<"chat" | "settings">("chat");
  const [input, setInput] = useState("");
  const viewportRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const isLoading = status === "streaming" || status === "submitted";
  const lastAssistantMessageId =
    [...messages].reverse().find((message) => message.role === "assistant")?.id ?? null;

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

    if (!value || isLoading) {
      return;
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

    await sendMessage({ text: prompt });
    requestAnimationFrame(scrollToBottom);
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
            {SIDEBAR_THREADS.map((thread) => (
              <button key={thread.title} type="button" className="thread-card">
                <strong>{thread.title}</strong>
                <span>{thread.preview}</span>
              </button>
            ))}
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
                    description="This is a minimal Vercel-style chat surface using AI SDK UI patterns. The sidebar is static for now, but the shell is ready for Convex-backed threads."
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
              {SETTINGS_GROUPS.map((group) => (
                <article key={group.title} className="settings-card">
                  <p className="sidebar-heading">{group.title}</p>
                  <div className="settings-list">
                    {group.items.map((item) => (
                      <div key={item.label} className="settings-row">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <article className="settings-card settings-card-wide">
              <p className="sidebar-heading">Environment</p>
              <div className="settings-list">
                <div className="settings-row">
                  <span>OpenAI API key</span>
                  <strong>{process.env.OPENAI_API_KEY ? "Configured" : "Add in .env.local"}</strong>
                </div>
                <div className="settings-row">
                  <span>Convex URL</span>
                  <strong>
                    {process.env.NEXT_PUBLIC_CONVEX_URL || "Missing NEXT_PUBLIC_CONVEX_URL"}
                  </strong>
                </div>
                <div className="settings-row">
                  <span>Personal deployment mode</span>
                  <strong>Vercel + Convex</strong>
                </div>
              </div>
            </article>
          </section>
        )}
      </section>
    </main>
  );
}
