import { injectable } from "tsyringe";
import type { DownloadProgress } from "../../types/php";
import type { MkcertStatus } from "../../types/site";
import type { IMkcertManager } from "../interfaces/IMkcertManager";

@injectable()
export class MockMkcertManager implements IMkcertManager {
  async getStatus(): Promise<MkcertStatus> {
    return {
      binaryInstalled: true,
      caInstalled: true,
      certPath: "/mock/certs/wildcard.test.pem",
      keyPath: "/mock/certs/wildcard.test-key.pem",
    };
  }

  async ensureInstalled(
    _onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {}
}
