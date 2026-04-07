import type { ToolModule } from "./manifest-types";
import agentBrowserToolModule from "./agent-browser";
import exampleToolModule from "./example-tool";
import excelizeToolModule from "./excelize";
import financeQueryToolModule from "./finance-query";
import googleWorkspaceToolModule from "./google-workspace";
import hackerNewsToolModule from "./hacker-news";
import notionToolModule from "./notion";
import posthogToolModule from "./posthog";
import toastToolModule from "./toast";
import weatherToolModule from "./weather";

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
