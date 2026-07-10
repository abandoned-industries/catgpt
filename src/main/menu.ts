import { Menu, type MenuItemConstructorOptions } from 'electron';

import { setZoomLevel } from './state';
import type { MainWindowHandle, MainWindowResolver } from './window';

const CHATGPT_URL = 'https://chatgpt.com/';
const ZOOM_STEP = 0.5;

const resolveUsableHandle = (
  resolveMainWindow: MainWindowResolver,
): MainWindowHandle | undefined => {
  const handle = resolveMainWindow();

  if (
    !handle ||
    handle.window.isDestroyed() ||
    handle.view.webContents.isDestroyed()
  ) {
    return undefined;
  }

  return handle;
};

const withMainWindow = (
  resolveMainWindow: MainWindowResolver,
  action: (handle: MainWindowHandle) => void,
): void => {
  const handle = resolveUsableHandle(resolveMainWindow);

  if (handle) {
    action(handle);
  }
};

const changeZoom = (
  resolveMainWindow: MainWindowResolver,
  delta: number,
): void => {
  withMainWindow(resolveMainWindow, ({ view }) => {
    const zoomLevel = view.webContents.getZoomLevel() + delta;
    view.webContents.setZoomLevel(zoomLevel);
    setZoomLevel(zoomLevel);
  });
};

export const buildApplicationMenu = (
  resolveMainWindow: MainWindowResolver,
): void => {
  const zoomIn = (): void => changeZoom(resolveMainWindow, ZOOM_STEP);

  const template: MenuItemConstructorOptions[] = [
    {
      label: 'CatGPT',
      submenu: [
        { label: 'About CatGPT', role: 'about' },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { label: 'Quit CatGPT', accelerator: 'Command+Q', role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Chat',
          accelerator: 'Command+N',
          click: () => {
            withMainWindow(resolveMainWindow, ({ view }) => {
              void view.webContents.loadURL(CHATGPT_URL);
            });
          },
        },
        { type: 'separator' },
        {
          label: 'Close Window',
          accelerator: 'Command+W',
          click: () => {
            withMainWindow(resolveMainWindow, ({ window }) => window.hide());
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'Command+R',
          click: () => {
            withMainWindow(resolveMainWindow, ({ view }) => {
              view.webContents.reload();
            });
          },
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          accelerator: 'Command+Plus',
          click: zoomIn,
        },
        {
          label: 'Zoom In',
          accelerator: 'Command+=',
          visible: false,
          click: zoomIn,
        },
        {
          label: 'Zoom Out',
          accelerator: 'Command+-',
          click: () => changeZoom(resolveMainWindow, -ZOOM_STEP),
        },
        {
          label: 'Actual Size',
          accelerator: 'Command+0',
          click: () => {
            withMainWindow(resolveMainWindow, ({ view }) => {
              view.webContents.setZoomLevel(0);
              setZoomLevel(0);
            });
          },
        },
        { type: 'separator' },
        {
          label: 'Toggle Full Screen',
          accelerator: 'Control+Command+F',
          role: 'togglefullscreen',
        },
      ],
    },
    {
      label: 'History',
      submenu: [
        {
          label: 'Back',
          accelerator: 'Command+[',
          click: () => {
            withMainWindow(resolveMainWindow, ({ view }) => {
              const { navigationHistory } = view.webContents;

              if (navigationHistory.canGoBack()) {
                navigationHistory.goBack();
              }
            });
          },
        },
        {
          label: 'Forward',
          accelerator: 'Command+]',
          click: () => {
            withMainWindow(resolveMainWindow, ({ view }) => {
              const { navigationHistory } = view.webContents;

              if (navigationHistory.canGoForward()) {
                navigationHistory.goForward();
              }
            });
          },
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};
