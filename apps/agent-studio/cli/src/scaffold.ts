import { existsSync } from "node:fs";
import { cp, mkdir, readdir } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import { scaffoldEntries, shouldSkipScaffoldRelativePath } from "./scaffold-manifest";

const packageTemplateRoot = resolve(import.meta.dir, "../template/workspace");
const sourceWorkspaceRoot = resolve(import.meta.dir, "../../../..");

export async function scaffoldWorkspace(targetRoot: string, options: { force?: boolean } = {}) {
  const destination = resolve(targetRoot);

  if (existsSync(destination)) {
    const entries = await readdir(destination);
    if (entries.length > 0 && !options.force) {
      throw new Error(`Target directory is not empty: ${destination}`);
    }
  } else {
    await mkdir(destination, { recursive: true });
  }

  const templateRoot = existsSync(packageTemplateRoot) ? packageTemplateRoot : null;

  if (templateRoot) {
    await copyTemplateDirectory(templateRoot, destination);
    return;
  }

  for (const entry of scaffoldEntries) {
    const sourcePath = join(sourceWorkspaceRoot, entry);
    const destinationPath = join(destination, entry);
    if (!existsSync(sourcePath)) {
      continue;
    }

    await cp(sourcePath, destinationPath, {
      recursive: true,
      force: true,
      errorOnExist: false,
      filter: (source) => !shouldSkipScaffoldRelativePath(relative(sourceWorkspaceRoot, source)),
    });
  }
}

export async function syncPackageTemplate() {
  await mkdir(packageTemplateRoot, { recursive: true });

  for (const entry of scaffoldEntries) {
    const sourcePath = join(sourceWorkspaceRoot, entry);
    const destinationPath = join(packageTemplateRoot, entry);
    if (!existsSync(sourcePath)) {
      continue;
    }

    await cp(sourcePath, destinationPath, {
      recursive: true,
      force: true,
      errorOnExist: false,
      filter: (source) => !shouldSkipScaffoldRelativePath(relative(sourceWorkspaceRoot, source)),
    });
  }
}

async function copyTemplateDirectory(templateRoot: string, destinationRoot: string) {
  const entries = await readdir(templateRoot);
  for (const entry of entries) {
    const sourcePath = join(templateRoot, entry);
    const destinationPath = join(destinationRoot, basename(entry));
    await cp(sourcePath, destinationPath, {
      recursive: true,
      force: true,
      errorOnExist: false,
      filter: (source) => !shouldSkipScaffoldRelativePath(relative(templateRoot, source)),
    });
  }
}
