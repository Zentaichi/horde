import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { dirname } from 'path';
import { ensureDir } from 'fs-extra';
import type { DownloadProgress } from '../types/php';

export async function downloadFile(
  url: string,
  destPath: string,
  onProgress?: (info: DownloadProgress) => void,
): Promise<void> {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Download failed: ${response.statusText}`);
  }

  await ensureDir(dirname(destPath));

  const totalBytes = Number(response.headers.get('content-length')) || 0;
  let transferredBytes = 0;

  const writer = createWriteStream(destPath);
  const nodeReadable = Readable.fromWeb(response.body as any);

  if (onProgress && totalBytes > 0) {
    nodeReadable.on('data', (chunk: Buffer) => {
      transferredBytes += chunk.length;
      onProgress({
        percent: Math.round((transferredBytes / totalBytes) * 100),
        transferredBytes,
        totalBytes,
      });
    });
  }

  await pipeline(nodeReadable, writer);
}
