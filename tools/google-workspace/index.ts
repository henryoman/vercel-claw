import {
  defineToolModule,
  type ShippedToolInstallSpec,
  type ShippedToolRuntimeSpec,
} from "../manifest-types";

const installSpec: ShippedToolInstallSpec = {
  id: "google-workspace",
  version: "0.1.0",
  label: "Google Workspace",
  description:
    "Google Workspace CLI docs and skill pack for Gmail, Calendar, Drive, Docs, Sheets, Chat, and Tasks workflows.",
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
    "Google Workspace CLI docs and skill pack for Gmail, Calendar, Drive, Docs, Sheets, Chat, and Tasks workflows.",
  defaultReadTargets: [
    "tools/google-workspace/README.md",
    "tools/google-workspace/basics.md",
    "tools/google-workspace/install.sh",
    "tools/google-workspace/skills/gws-shared/SKILL.md",
  ],
  capabilities: [
    "Google Workspace CLI setup guidance",
    "Service-specific command discovery for Gmail, Calendar, Drive, Docs, Sheets, Chat, and Tasks",
    "Workflow skills for common Google Workspace automation tasks",
  ],
  contextHints: [
    "Start with basics.md before suggesting service-specific commands.",
    "Use skills for common workflows, but inspect the raw CLI schema before suggesting write operations.",
  ],
  promptHints: [
    "Discover commands with gws --help and gws schema before guessing flags.",
    "Quote sheet ranges containing ! when showing zsh examples.",
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
