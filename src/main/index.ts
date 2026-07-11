import { Menu, app, type BrowserWindow, type WebContents } from 'electron';

import { configureAboutPanel } from './about';
import { attachDownloadHandling } from './downloads';
import { registerGlobalHotkey, unregisterGlobalHotkey } from './hotkey';
import { buildApplicationMenu } from './menu';
import { attachNavigationPolicy, OAUTH_POPUP_HOSTS } from './navigation';
import { configurePermissions } from './permissions';
import { configureAppSession } from './session';
import { showSplashIfNeeded } from './splash';
import { createMainWindow, type MainWindowHandle } from './window';

let mainWindow: MainWindowHandle | undefined;
let quitting = false;
let registeredHotkey: string | undefined;
const trackedOAuthPopups = new Set<number>();

const CHATGPT_URL = 'https://chatgpt.com/';
const OAUTH_RECOVERY_DELAY_MS = 1_200;

const isOAuthPopupUrl = (rawUrl: string): boolean => {
  try {
    return OAUTH_POPUP_HOSTS.includes(
      new URL(rawUrl).hostname as (typeof OAUTH_POPUP_HOSTS)[number],
    );
  } catch {
    return false;
  }
};

const isAuthLimboUrl = (rawUrl: string): boolean => {
  if (!rawUrl || rawUrl === 'about:blank') {
    return true;
  }

  try {
    const url = new URL(rawUrl);
    return (
      url.hostname === 'auth.openai.com' ||
      (url.hostname === 'chatgpt.com' && url.pathname.startsWith('/auth'))
    );
  } catch {
    return false;
  }
};

const trackOAuthPopup = (contents: WebContents, initialUrl: string): void => {
  if (!isOAuthPopupUrl(initialUrl) || trackedOAuthPopups.has(contents.id)) {
    return;
  }

  trackedOAuthPopups.add(contents.id);
  contents.once('destroyed', () => {
    trackedOAuthPopups.delete(contents.id);
    setTimeout(() => {
      const handle = resolveMainWindow();

      if (
        !handle ||
        handle.window.isDestroyed() ||
        handle.view.webContents.isDestroyed() ||
        !isAuthLimboUrl(handle.view.webContents.getURL())
      ) {
        return;
      }

      if (!app.isPackaged) {
        console.log('[oauth] recovered blank post-login state');
      }
      void handle.view.webContents.loadURL(CHATGPT_URL);
    }, OAUTH_RECOVERY_DELAY_MS);
  });
};

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

  handle.view.webContents.on('did-create-window', (childWindow, details) => {
    trackOAuthPopup(childWindow.webContents, details.url);
  });

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
