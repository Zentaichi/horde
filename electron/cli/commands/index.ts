import type { Command } from "../types";
import { versionCommand } from "./version";
import { phpVersionCommand } from "./php-version";
import { projectsCommand } from "./projects";
import { sitesCommand } from "./sites";
import { serversCommand } from "./servers";

export const commands: Command[] = [
  versionCommand,
  phpVersionCommand,
  projectsCommand,
  sitesCommand,
  serversCommand,
];
