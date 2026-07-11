import { Menu, app, type BrowserWindow } from 'electron';

import { configureAboutPanel } from './about';
import { attachDownloadHandling } from './downloads';
import { registerGlobalHotkey, unregisterGlobalHotkey } from './hotkey';
import { buildApplicationMenu } from './menu';
import { attachNavigationPolicy } from './navigation';
import { configurePermissions } from './permissions';
import { configureAppSession } from './session';
import { showSplashIfNeeded } from './splash';
import { createMainWindow, type MainWindowHandle } from './window';

let mainWindow: MainWindowHandle | undefined;
let quitting = false;
let registeredHotkey: string | undefined;

const resolveMainWindow = (): MainWindowHandle | undefined => mainWindow;

const showMainWindow = (window: BrowserWindow): void => {
  if (window.isMinimized()) {
    window.restore();
  }

  window.show();
  window.focus();
};

const createAndTrackMainWindow = (): MainWindowHandle => {
  const handle = createMainWindow();
  mainWindow = handle;

  handle.window.on('close', (event) => {
    if (!quitting) {
      event.preventDefault();
      handle.window.hide();
      // Yield activation: otherwise CatGPT stays the active app with no
      // window, and macOS never fires 'activate' on dock clicks — the
      // window becomes unreachable.
      app.hide();
    }
  });

  handle.window.on('closed', () => {
    if (mainWindow === handle) {
      mainWindow = undefined;
    }
  });

  handle.window.on('focus', () => {
    // HTML5 notifications expose no main-process event from which to set a badge.
    // Clearing is reliable; badge-setting remains intentionally unimplemented.
    app.dock?.setBadge('');
  });

  return handle;
};

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.window.isDestroyed()) {
      showMainWindow(mainWindow.window);
    }
  });

  app.on('before-quit', () => {
    quitting = true;
    mainWindow?.persistState();
  });

  app.on('will-quit', () => {
    if (registeredHotkey) {
      unregisterGlobalHotkey(registeredHotkey);
      registeredHotkey = undefined;
    }
  });

  app.on('web-contents-created', (_event, contents) => {
    attachNavigationPolicy(contents);
    contents.on('will-attach-webview', (event) => event.preventDefault());
  });

  app.on('ready', () => {
    configureAboutPanel();
    const appSession = configureAppSession();
    configurePermissions(appSession);
    attachDownloadHandling(appSession, resolveMainWindow);
    buildApplicationMenu(resolveMainWindow);
    registeredHotkey = registerGlobalHotkey(resolveMainWindow);
    const handle = createAndTrackMainWindow();
    void showSplashIfNeeded(appSession, handle.window).catch((error: unknown) => {
      if (!app.isPackaged) {
        console.warn('[splash] Failed to determine login state', error);
      }
    });

    // Dock menu as a recovery path that never depends on event timing.
    app.dock?.setMenu(
      Menu.buildFromTemplate([
        {
          label: 'Show CatGPT',
          click: () => {
            if (mainWindow && !mainWindow.window.isDestroyed()) {
              showMainWindow(mainWindow.window);
            }
          },
        },
        {
          label: 'New Chat',
          click: () => {
            if (mainWindow && !mainWindow.window.isDestroyed()) {
              showMainWindow(mainWindow.window);
              void mainWindow.view.webContents.loadURL('https://chatgpt.com/');
            }
          },
        },
      ]),
    );
  });

  app.on('activate', () => {
    if (mainWindow && !mainWindow.window.isDestroyed()) {
      showMainWindow(mainWindow.window);
      return;
    }

    createAndTrackMainWindow();
  });
}
