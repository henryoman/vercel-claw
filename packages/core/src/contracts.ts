export const surfaces = ["web", "telegram"] as const;
export type Surface = (typeof surfaces)[number];

export const threadStatuses = ["idle", "running", "completed", "errored"] as const;
export type ThreadStatus = (typeof threadStatuses)[number];

export const messageRoles = ["system", "user", "assistant", "tool"] as const;
export type MessageRole = (typeof messageRoles)[number];

export const settingScopes = ["global", "web", "telegram"] as const;
export type SettingScope = (typeof settingScopes)[number];

export const artifactKinds = ["file", "note", "result"] as const;
export type ArtifactKind = (typeof artifactKinds)[number];

export const DEFAULT_AGENT_SLUG = "default";
export const DEFAULT_INSTANCE_ID = "000";

export interface ThreadSummary {
  id: string;
  agentId: string;
  instanceId: string;
  title: string;
  status: ThreadStatus;
  surface: Surface;
  externalThreadId: string | null;
  externalUserId: string | null;
  lastMessageAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface ThreadMessage {
  id: string;
  threadId: string;
  instanceId: string;
  role: MessageRole;
  surface: Surface;
  content: string;
  externalMessageId: string | null;
  createdAt: number;
}

export interface ThreadDetail {
  thread: ThreadSummary;
  messages: ThreadMessage[];
}

export interface SettingRecord {
  id: string;
  scope: SettingScope;
  key: string;
  label: string;
  value: string;
  updatedAt: number;
}

export interface ArtifactRecord {
  id: string;
  threadId: string;
  instanceId: string;
  kind: ArtifactKind;
  label: string;
  surface: Surface;
  text: string | null;
  storageId: string | null;
  externalArtifactId: string | null;
  createdAt: number;
}

export interface CreateThreadRequest {
  title?: string;
  instanceId: string;
  surface: Surface;
  agentSlug?: string;
  externalThreadId?: string;
  externalUserId?: string;
}

export interface ChatSendRequest {
  threadId: string;
  surface: Surface;
  messages: Array<{
    id?: string;
    role: MessageRole;
    text: string;
    createdAt?: string;
  }>;
}

export interface ChatSendResponse {
  thread: ThreadSummary;
  userMessage: ThreadMessage;
}

export interface UpdateSettingRequest {
  scope: SettingScope;
  key: string;
  label: string;
  value: string;
}

export interface TelegramWebhookRequest {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    chat: {
      id: number;
      type: string;
      title?: string;
      username?: string;
    };
    from?: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
  };
}

export interface TelegramWebhookResponse {
  ok: boolean;
  threadId: string | null;
  reply: string | null;
}

export const defaultSettings = [
  {
    scope: "global" as const,
    key: "model.defaultModel",
    label: "Default model",
    value: "gpt-5-mini",
  },
  {
    scope: "global" as const,
    key: "model.systemPrompt",
    label: "System prompt",
    value: "You are vercel-claw, a concise personal AI operator deployed with shared state stored in Convex.",
  },
];
