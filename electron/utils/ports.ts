import { createServer, connect } from "net";

export function isPortOpen(port: number, host = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ port, host });
    const done = (open: boolean) => {
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(1000);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

export function findFreePort(startPort = 8080, count = 100): Promise<number> {
  return new Promise((resolve, reject) => {
    let port = startPort;
    const maxPort = startPort + count;

    function tryPort(): void {
      if (port > maxPort) {
        return reject(new Error("No free ports available."));
      }

      const server = createServer();
      server.listen(port, "127.0.0.1", () => {
        server.close(() => resolve(port));
      });
      server.on("error", () => {
        port++;
        tryPort();
      });
    }

    tryPort();
  });
}
