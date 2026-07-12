"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadFile = downloadFile;
const fs_1 = require("fs");
const promises_1 = require("stream/promises");
const fs_extra_1 = require("fs-extra"); // we'll add fs-extra next
async function downloadFile(url, destPath, onProgress) {
    const response = await fetch(url);
    if (!response.ok || !response.body) {
        throw new Error(`Failed to download: ${response.statusText}`);
    }
    const totalBytes = Number(response.headers.get('content-length')) || 0;
    let transferredBytes = 0;
    // Ensure destination directory exists
    const destDir = destPath.substring(0, destPath.lastIndexOf('\\'));
    await (0, fs_extra_1.ensureDir)(destDir);
    const writer = (0, fs_1.createWriteStream)(destPath);
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
    await (0, promises_1.pipeline)(nodeReadable, writer);
}
//# sourceMappingURL=download.js.map