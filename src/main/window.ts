import { BrowserWindow, WebContentsView, screen } from 'electron';
import path from 'node:path';

import { CHATGPT_PARTITION } from './session';
import {
  getWindowBounds,
  getZoomLevel,
  setWindowBounds,
  setZoomLevel,
  type WindowBounds,
} from './state';

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 800;
const MINIMUM_WIDTH = 800;
const MINIMUM_HEIGHT = 600;
const DRAG_STRIP_HEIGHT = 28;
const BOUNDS_SAVE_DELAY_MS = 500;

export interface MainWindowHandle {
  window: BrowserWindow;
  view: WebContentsView;
  persistState: () => void;
}

const positionOnScreen = (bounds: WindowBounds): boolean =>
  screen.getAllDisplays().some((display) => {
    const area = display.workArea;
    return (
      bounds.x < area.x + area.width &&
      bounds.x + bounds.width > area.x &&
      bounds.y < area.y + area.height &&
      bounds.y + bounds.height > area.y
    );
  });

const loadLocalChrome = (window: BrowserWindow): void => {
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    return;
  }

  void window.loadFile(
    path.join(
      __dirname,
      `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`,
    ),
  );
};

export const createMainWindow = (): MainWindowHandle => {
  const savedBounds = getWindowBounds();
  const position =
    savedBounds && positionOnScreen(savedBounds)
      ? { x: savedBounds.x, y: savedBounds.y }
      : {};
  const window = new BrowserWindow({
    ...position,
    width: savedBounds?.width ?? DEFAULT_WIDTH,
    height: savedBounds?.height ?? DEFAULT_HEIGHT,
    minWidth: MINIMUM_WIDTH,
    minHeight: MINIMUM_HEIGHT,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  loadLocalChrome(window);

  const view = new WebContentsView({
    webPreferences: {
      partition: CHATGPT_PARTITION,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  window.contentView.addChildView(view);

  const updateViewBounds = (): void => {
    const { width, height } = window.getContentBounds();
    const stripHeight = window.isFullScreen() ? 0 : DRAG_STRIP_HEIGHT;
    view.setBounds({
      x: 0,
      y: stripHeight,
      width,
      height: Math.max(0, height - stripHeight),
    });
  };

  updateViewBounds();
  window.on('resize', updateViewBounds);
  window.on('enter-full-screen', updateViewBounds);
  window.on('leave-full-screen', updateViewBounds);

  const restoreZoomLevel = (): void => {
    view.webContents.setZoomLevel(getZoomLevel());
  };

  restoreZoomLevel();
  view.webContents.on('did-finish-load', restoreZoomLevel);
  view.webContents.on('zoom-changed', () => {
    setTimeout(() => {
      if (!view.webContents.isDestroyed()) {
        setZoomLevel(view.webContents.getZoomLevel());
      }
    }, 0);
  });

  let boundsSaveTimer: ReturnType<typeof setTimeout> | undefined;

  const saveBounds = (): void => {
    setWindowBounds(window.getNormalBounds());
  };

  const scheduleBoundsSave = (): void => {
    if (boundsSaveTimer) {
      clearTimeout(boundsSaveTimer);
    }

    boundsSaveTimer = setTimeout(() => {
      boundsSaveTimer = undefined;
      saveBounds();
    }, BOUNDS_SAVE_DELAY_MS);
  };

  window.on('moved', scheduleBoundsSave);
  window.on('resized', scheduleBoundsSave);

  const persistState = (): void => {
    if (boundsSaveTimer) {
      clearTimeout(boundsSaveTimer);
      boundsSaveTimer = undefined;
    }

    saveBounds();
    if (!view.webContents.isDestroyed()) {
      setZoomLevel(view.webContents.getZoomLevel());
    }
  };

  void view.webContents.loadURL('https://chatgpt.com');

  return { window, view, persistState };
};
