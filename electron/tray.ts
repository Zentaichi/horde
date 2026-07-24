import { Tray, Menu, app, nativeImage, type BrowserWindow } from 'electron';
import { container } from 'tsyringe';
import { ServiceRegistry } from './services/service-registry';

let tray: Tray | null = null;
let contextMenuInterval: ReturnType<typeof setInterval> | null = null;

function createPlaceholderIcon(): Electron.NativeImage {
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      canvas[i] = 249;     // R
      canvas[i + 1] = 115; // G
      canvas[i + 2] = 22;  // B
      canvas[i + 3] = 255; // A
    }
  }

  return nativeImage.createFromBuffer(canvas, { width: size, height: size, scaleFactor: 1 });
}

async function buildContextMenu(win: BrowserWindow): Promise<Menu> {
  const registry = container.resolve(ServiceRegistry);
  const statuses = await registry.getAllStatuses();

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Show Horde',
      click: () => {
        win.show();
        win.focus();
      },
    },
    { type: 'separator' },
  ];

  const running = statuses.filter((s) => s.running);
  if (running.length > 0) {
    for (const s of running) {
      template.push({
        label: `${s.displayName} (${s.port ? ':' + s.port : ''})`,
        enabled: false,
      });
    }
    template.push({ type: 'separator' });
  } else {
    template.push({
      label: 'No services running',
      enabled: false,
    });
    template.push({ type: 'separator' });
  }

  template.push({
    label: 'Quit',
      click: () => {
        win.destroy();
        tray = null;
        app.quit();
      },
  });

  return Menu.buildFromTemplate(template);
}

export function createTray(win: BrowserWindow): void {
  const icon = createPlaceholderIcon();
  tray = new Tray(icon);
  tray.setToolTip('Horde');

  tray.on('click', () => {
    win.show();
    win.focus();
  });

  tray.on('right-click', async () => {
    const menu = await buildContextMenu(win);
    tray?.popUpContextMenu(menu);
  });

  if (contextMenuInterval) clearInterval(contextMenuInterval);

  contextMenuInterval = setInterval(() => {
    if (tray && !win.isDestroyed()) {
      buildContextMenu(win).then((menu) => tray?.setContextMenu(menu)).catch(() => {});
    }
  }, 5000);
}
