import type { PostHogCapabilitySnapshot, PostHogServerConfig } from "./config";
import { getPostHogCapabilities, getPostHogConfig } from "./config";
import {
  buildPostHogDashboardSnapshot,
  type PostHogDashboardSnapshot,
} from "./dashboard-snapshot";
import {
  getPostHogDocumentedToolCatalog,
  type PostHogDocumentedToolCatalog,
} from "./documented-tool-catalog";
import { PostHogMcpClient } from "./mcp-client";
import type {
  PostHogInsightQueryResult,
  PostHogOrganizationSummary,
  PostHogProjectSummary,
} from "./types";

type FetchFn = (input: URL | RequestInfo, init?: RequestInit) => Promise<Response>;

export interface PostHogErrorObservation {
  readonly id: string;
  readonly status: string;
  readonly name: string;
  readonly description: string;
  readonly firstSeen: string | null;
  readonly url: string | null;
}

interface ErrorTrackingIssueRow {
  readonly id?: string | null;
  readonly status?: string | null;
  readonly name?: string | null;
  readonly description?: string | null;
  readonly first_seen?: string | null;
  readonly _posthogUrl?: string | null;
}

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const writeStderrLine = (value: string): void => {
  process.stderr.write(`${value}\n`);
};

export class PostHogClient {
  private readonly mcpClient: PostHogMcpClient;

  constructor(
    readonly config: PostHogServerConfig,
    readonly capabilities: PostHogCapabilitySnapshot,
    fetchFn: FetchFn = fetch,
  ) {
    this.mcpClient = new PostHogMcpClient(config, fetchFn);
  }

  async getOrganizations(): Promise<readonly PostHogOrganizationSummary[]> {
    return await this.mcpClient.getOrganizations();
  }

  async getProjects(organizationId?: string): Promise<{
    readonly organizationId: string;
    readonly projects: readonly PostHogProjectSummary[];
  }> {
    return await this.mcpClient.getProjects(organizationId);
  }

  async listMcpTools(input: {
    readonly nameFilter?: string;
    readonly includeInputSchema?: boolean;
    readonly limit?: number;
  } = {}): Promise<{
    readonly total: number;
    readonly returned: number;
    readonly tools: ReadonlyArray<{
      readonly name: string;
      readonly title?: string | null;
      readonly description?: string | null;
      readonly inputSchema?: unknown;
    }>;
  }> {
    const normalizedFilter = input.nameFilter?.trim().toLowerCase() ?? "";
    const includeInputSchema = input.includeInputSchema === true;
    const limit = input.limit ?? 50;
    const allTools = await this.mcpClient.listTools();
    const filteredTools = normalizedFilter
      ? allTools.filter(
          (tool) =>
            tool.name.toLowerCase().includes(normalizedFilter)
            || tool.title?.toLowerCase().includes(normalizedFilter)
            || tool.description?.toLowerCase().includes(normalizedFilter),
        )
      : allTools;

    const tools = filteredTools.slice(0, limit).map((tool) => ({
      name: tool.name,
      title: tool.title ?? null,
      description: tool.description ?? null,
      inputSchema: includeInputSchema ? tool.inputSchema : undefined,
    }));

    return {
      total: filteredTools.length,
      returned: tools.length,
      tools,
    };
  }

  async runQuery(
    name: string,
    query: string,
    refresh?: string,
  ): Promise<PostHogInsightQueryResult> {
    if (refresh) {
      writeStderrLine(
        `[posthog-mcp] ignoring unsupported refresh mode "${refresh}" for query-run`,
      );
    }

    return await this.mcpClient.runQuery(name, query);
  }

  async callMcpTool(
    toolName: string,
    args: Record<string, unknown> = {},
  ): Promise<{
    readonly toolName: string;
    readonly text: string;
    readonly structuredContent?: unknown;
  }> {
    return await this.mcpClient.callNamedTool(toolName, args);
  }

  async listErrors(): Promise<readonly PostHogErrorObservation[]> {
    const result = await this.callMcpTool("error-tracking-issues-list", {
      limit: 25,
      offset: 0,
    });
    const structured = asRecord(result.structuredContent);
    const rows = Array.isArray(structured?.results) ? structured.results : [];

    return rows.flatMap((row) => {
      const issue = row as ErrorTrackingIssueRow;
      const id = issue.id?.trim();
      if (!id) {
        return [];
      }

      return [
        {
          id,
          status: issue.status?.trim() || "unknown",
          name: issue.name?.trim() || "Error",
          description: issue.description?.trim() || "No error description provided",
          firstSeen: issue.first_seen?.trim() || null,
          url: issue._posthogUrl?.trim() || null,
        } satisfies PostHogErrorObservation,
      ];
    });
  }

  getDocumentedToolCatalog(input: {
    readonly feature?: string;
    readonly priority?: "core" | "high";
  } = {}): PostHogDocumentedToolCatalog {
    return getPostHogDocumentedToolCatalog(input);
  }

  async getDashboardSnapshot(input: {
    readonly windowMinutes?: number;
    readonly topPathsLimit?: number;
  } = {}): Promise<PostHogDashboardSnapshot> {
    return await buildPostHogDashboardSnapshot({
      windowMinutes: input.windowMinutes,
      topPathsLimit: input.topPathsLimit,
      runQuery: async (name, query) => await this.runQuery(name, query),
    });
  }
}

export function getPostHogClient(): PostHogClient | null {
  const config = getPostHogConfig();
  const capabilities = getPostHogCapabilities(config);

  if (!capabilities.hasApiKey) {
    return null;
  }

  return new PostHogClient(config, capabilities);
}
