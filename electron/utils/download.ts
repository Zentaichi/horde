import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import { app } from 'electron';
import { ensureDir } from 'fs-extra'; // we'll add fs-extra next

export interface ProgressInfo {
  percent: number;
  transferredBytes: number;
  totalBytes: number;
}

export async function downloadFile(
  url: string,
  destPath: string,
  onProgress?: (info: ProgressInfo) => void
): Promise<void> {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }

  const totalBytes = Number(response.headers.get('content-length')) || 0;
  let transferredBytes = 0;

  // Ensure destination directory exists
  const destDir = destPath.substring(0, destPath.lastIndexOf('\\'));
  await ensureDir(destDir);

  const writer = createWriteStream(destPath);

  // Readable stream wrapper to track progress
  const reader = response.body.getReader();
  const stream = new ReadableStream({
    async start(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          break;
        }
        transferredBytes += value.length;
        if (onProgress && totalBytes > 0) {
          onProgress({
            percent: Math.round((transferredBytes / totalBytes) * 100),
            transferredBytes,
            totalBytes,
          });
        }
        controller.enqueue(value);
      }
    },
  });

  // Node.js doesn't have a direct way to pipe a web ReadableStream to a file stream,
  // so we’ll use a temporary approach: consume the stream and write to file manually.
  // Simpler: just use node-fetch, but to avoid extra deps, we can do this:

  // Actually, we can convert the web stream to a Node.js Readable using Readable.fromWeb
  // (available since Node 17). Let’s do that.
  const nodeReadable = require('stream').Readable.fromWeb(stream);
  await pipeline(nodeReadable, writer);
}