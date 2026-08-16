import { injectable } from "tsyringe";
import { ComposerScaffolder } from "./composer-scaffolder";

@injectable()
export class LaravelScaffolder extends ComposerScaffolder {
  readonly id = "laravel";
  readonly displayName = "Laravel";
  readonly minPhpVersion = "8.2.0";
  protected readonly packageName = "laravel/laravel";
}
