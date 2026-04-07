#!/usr/bin/env bun

import { syncPackageTemplate } from "../src/scaffold";

await syncPackageTemplate();
console.log("Synced workspace template into apps/agent-studio/cli/template/workspace");
