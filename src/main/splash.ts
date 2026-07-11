import { BrowserWindow, type Session } from 'electron';
import path from 'node:path';

// Login detection is deliberately limited to cookie names. Values are never read.
export const SESSION_COOKIE_NAME_MATCHERS = [
  { match: 'contains', value: 'session' },
  { match: 'startsWith', value: '__Secure-next-auth' },
] as const;

const isSessionCookieName = (name: string): boolean => {
  const normalizedName = name.toLowerCase();

  return SESSION_COOKIE_NAME_MATCHERS.some(({ match, value }) => {
    const normalizedValue = value.toLowerCase();
    return match === 'contains'
      ? normalizedName.includes(normalizedValue)
      : normalizedName.startsWith(normalizedValue);
  });
};

export const isLoggedIn = async (appSession: Session): Promise<boolean> => {
  const cookieSets = await Promise.all([
    appSession.cookies.get({ domain: 'chatgpt.com' }),
    appSession.cookies.get({ domain: '.openai.com' }),
  ]);

  return cookieSets.flat().some(({ name }) => isSessionCookieName(name));
};

const loadSplash = async (window: BrowserWindow): Promise<void> => {
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    const baseUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL.replace(/\/$/, '');
    await window.loadURL(`${baseUrl}/splash.html`);
    return;
  }

  await window.loadFile(
    path.join(
      __dirname,
      `../renderer/${MAIN_WINDOW_VITE_NAME}/splash.html`,
    ),
  );
};

export const showSplashIfNeeded = async (
  appSession: Session,
  parent: BrowserWindow,
): Promise<BrowserWindow | undefined> => {
  if (await isLoggedIn(appSession)) {
    return undefined;
  }

  if (parent.isDestroyed()) {
    return undefined;
  }

  const splash = new BrowserWindow({
    width: 560,
    height: 640,
    center: true,
    show: false,
    parent,
    titleBarStyle: 'hiddenInset',
    resizable: false,
    minimizable: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  await loadSplash(splash);

  if (!splash.isDestroyed()) {
    splash.show();
    splash.focus();
  }

  return splash;
};
