import type { DownloadProgress } from "../../types/php";
import type { MkcertStatus } from "../../types/site";

export interface IMkcertManager {
  getStatus(): Promise<MkcertStatus>;
  ensureInstalled(
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void>;
}
