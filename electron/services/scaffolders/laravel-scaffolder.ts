import { inject, injectable } from "tsyringe";
import type { IPlatformAdapter } from "../../platform/IPlatformAdapter";
import type { IPhpManager } from "../interfaces/IPhpManager";
import { ComposerScaffolder } from "./composer-scaffolder";

@injectable()
export class LaravelScaffolder extends ComposerScaffolder {
  readonly id = "laravel";
  readonly displayName = "Laravel";
  readonly minPhpVersion = "8.2.0";
  protected readonly packageName = "laravel/laravel";

  constructor(
    @inject("IPlatformAdapter") platform: IPlatformAdapter,
    @inject("IPhpManager") phpManager: IPhpManager
  ) {
    super(platform, phpManager);
  }
}
