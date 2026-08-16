import { inject, injectable } from "tsyringe";
import type { IPlatformAdapter } from "../../platform/IPlatformAdapter";
import type { IPhpManager } from "../interfaces/IPhpManager";
import { ComposerScaffolder } from "./composer-scaffolder";

@injectable()
export class SymfonyScaffolder extends ComposerScaffolder {
  readonly id = "symfony";
  readonly displayName = "Symfony";
  readonly minPhpVersion = "8.2.0";
  protected readonly packageName = "symfony/skeleton";

  constructor(
    @inject("IPlatformAdapter") platform: IPlatformAdapter,
    @inject("IPhpManager") phpManager: IPhpManager
  ) {
    super(platform, phpManager);
  }

  protected override async postCreate(
    phpBinary: string,
    composer: string,
    targetPath: string,
    onLog?: (line: string) => void
  ): Promise<void> {
    await this.runProcess(
      phpBinary,
      [composer, "require", "webapp", "--no-interaction"],
      onLog,
      targetPath
    );
  }
}
