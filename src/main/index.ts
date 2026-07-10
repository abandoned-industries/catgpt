import { app, type BrowserWindow } from 'electron';

import { attachNavigationPolicy } from './navigation';
import { configurePermissions } from './permissions';
import { configureAppSession } from './session';
import { createMainWindow, type MainWindowHandle } from './window';

let mainWindow: MainWindowHandle | undefined;
let quitting = false;

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
    }
  });

  handle.window.on('closed', () => {
    if (mainWindow === handle) {
      mainWindow = undefined;
    }
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

  app.on('web-contents-created', (_event, contents) => {
    attachNavigationPolicy(contents);
    contents.on('will-attach-webview', (event) => event.preventDefault());
  });

  app.on('ready', () => {
    const appSession = configureAppSession();
    configurePermissions(appSession);
    createAndTrackMainWindow();
  });

  app.on('activate', () => {
    if (mainWindow && !mainWindow.window.isDestroyed()) {
      showMainWindow(mainWindow.window);
      return;
    }

    createAndTrackMainWindow();
  });
}
