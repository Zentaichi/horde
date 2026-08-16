import { injectable } from "tsyringe";
import { ComposerScaffolder } from "./composer-scaffolder";

@injectable()
export class SymfonyScaffolder extends ComposerScaffolder {
  readonly id = "symfony";
  readonly displayName = "Symfony";
  readonly minPhpVersion = "8.2.0";
  protected readonly packageName = "symfony/skeleton";

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
