import { Tray, Menu, app, nativeImage, type BrowserWindow } from "electron";
import * as path from "path";
import { container } from "tsyringe";
import { ServiceRegistry } from "./services/service-registry";

let tray: Tray | null = null;
let contextMenuInterval: ReturnType<typeof setInterval> | null = null;

function createTrayIcon(): Electron.NativeImage {
  const iconPath = path.join(
    __dirname,
    "..",
    "..",
    "resources",
    "horde_icon.ico",
  );
  return nativeImage.createFromPath(iconPath);
}

async function buildContextMenu(win: BrowserWindow): Promise<Menu> {
  const registry = container.resolve(ServiceRegistry);
  const statuses = await registry.getAllStatuses();

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "Show Horde",
      click: () => {
        win.show();
        win.focus();
      },
    },
    { type: "separator" },
  ];

  const running = statuses.filter((s) => s.running);
  if (running.length > 0) {
    for (const s of running) {
      template.push({
        label: `${s.displayName} (${s.port ? ":" + s.port : ""})`,
        enabled: false,
      });
    }
    template.push({ type: "separator" });
  } else {
    template.push({
      label: "No services running",
      enabled: false,
    });
    template.push({ type: "separator" });
  }

  template.push({
    label: "Quit",
    click: () => {
      win.destroy();
      tray = null;
      app.quit();
    },
  });

  return Menu.buildFromTemplate(template);
}

export function createTray(win: BrowserWindow): void {
  const icon = createTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip("Horde");

  tray.on("click", () => {
    win.show();
    win.focus();
  });

  tray.on("right-click", async () => {
    const menu = await buildContextMenu(win);
    tray?.popUpContextMenu(menu);
  });

  if (contextMenuInterval) clearInterval(contextMenuInterval);

  contextMenuInterval = setInterval(() => {
    if (tray && !win.isDestroyed()) {
      buildContextMenu(win)
        .then((menu) => tray?.setContextMenu(menu))
        .catch(() => {});
    }
  }, 5000);
}
