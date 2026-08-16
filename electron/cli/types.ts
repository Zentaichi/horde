export interface CliClient {
  request(command: string, args?: Record<string, unknown>): Promise<unknown>;
}

export interface Command {
  name: string;
  help: string;
  run(args: string[], client: CliClient): Promise<number>;
}
