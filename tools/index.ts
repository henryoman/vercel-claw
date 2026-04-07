import type { ToolModule } from "./manifest-types";
import agentBrowserToolModule from "./included/agent-browser";
import googleWorkspaceToolModule from "./included/google-workspace";
import notionToolModule from "./included/notion";
import exampleToolModule from "./add-on/example-tool";
import excelizeToolModule from "./add-on/excelize";
import financeQueryToolModule from "./add-on/finance-query";
import hackerNewsToolModule from "./add-on/hacker-news";
import posthogToolModule from "./add-on/posthog";
import toastToolModule from "./add-on/toast";
import weatherToolModule from "./add-on/weather";

export const shippedToolModules = [
  notionToolModule,
  agentBrowserToolModule,
  posthogToolModule,
  weatherToolModule,
  googleWorkspaceToolModule,
] satisfies ToolModule[];

export const referenceToolModules = [
  exampleToolModule,
  excelizeToolModule,
  financeQueryToolModule,
  hackerNewsToolModule,
  toastToolModule,
] satisfies ToolModule[];

export const allToolModules = [...shippedToolModules, ...referenceToolModules] satisfies ToolModule[];

export const toolModulesById = Object.fromEntries(
  allToolModules.map((toolModule) => [toolModule.runtimeSpec.id, toolModule]),
) as Record<string, ToolModule>;

export const toolModuleDirectories = {
  "agent-browser": "tools/included/agent-browser",
  "google-workspace": "tools/included/google-workspace",
  notion: "tools/included/notion",
  "example-tool": "tools/add-on/example-tool",
  excelize: "tools/add-on/excelize",
  "finance-query": "tools/add-on/finance-query",
  "hacker-news": "tools/add-on/hacker-news",
  posthog: "tools/add-on/posthog",
  toast: "tools/add-on/toast",
  weather: "tools/add-on/weather",
} as const satisfies Record<string, string>;
