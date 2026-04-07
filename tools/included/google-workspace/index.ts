import {
  defineToolModule,
  type ShippedToolInstallSpec,
  type ShippedToolRuntimeSpec,
} from "../../manifest-types";

const installSpec: ShippedToolInstallSpec = {
  id: "google-workspace",
  version: "0.1.0",
  label: "Google Workspace",
  description:
    "Google Workspace CLI docs, skills, and typed Gmail and Calendar wrappers for sending email, replying, reading messages, and creating events.",
  kind: "cli",
  activationScope: "instance",
  dependencies: [],
  installCommands: [],
  verifyCommands: [
    {
      label: "Check Google Workspace CLI",
      command: ["gws", "--help"],
      cwd: "workspace",
    },
  ],
  requiredEnvVars: [],
  optionalEnvVars: [],
  cacheSubdir: "google-workspace",
};

const runtimeSpec: ShippedToolRuntimeSpec = {
  id: "google-workspace",
  label: "Google Workspace",
  runtime: "metadata",
  docsFile: "README.md",
  description:
    "Google Workspace CLI docs, skills, and typed Gmail and Calendar wrappers for sending email, replying, reading messages, and creating events.",
  defaultReadTargets: [
    "tools/included/google-workspace/README.md",
    "tools/included/google-workspace/basics.md",
    "tools/included/google-workspace/install.sh",
    "tools/included/google-workspace/skills/gws-shared/SKILL.md",
  ],
  capabilities: [
    "Google Workspace CLI setup guidance",
    "Typed Gmail actions for send, reply, reply-all, forward, read, and triage",
    "Typed Calendar actions for agenda lookups and event creation",
    "Workflow skills for common Google Workspace automation tasks",
  ],
  contextHints: [
    "Start with basics.md before suggesting service-specific commands.",
    "Prefer the typed Gmail and Calendar wrappers before hand-writing raw gws commands.",
    "Use the skill docs to match real gws flags for write operations.",
  ],
  promptHints: [
    "Use the Gmail and Calendar helper commands when the user wants to send email or create events.",
    "Fall back to raw gws schema inspection only when the typed wrappers do not cover the request.",
  ],
};

const googleWorkspaceToolModule = defineToolModule({
  installSpec,
  runtimeSpec,
});

export const googleWorkspaceTool = googleWorkspaceToolModule;
export const googleWorkspaceInstallSpec = googleWorkspaceToolModule.installSpec;
export const googleWorkspaceRuntimeSpec = googleWorkspaceToolModule.runtimeSpec;

export default googleWorkspaceToolModule;
