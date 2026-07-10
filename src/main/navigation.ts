import { app, shell, type WebContents } from 'electron';

import { CHATGPT_PARTITION } from './session';

export const OAUTH_POPUP_HOSTS = [
  'accounts.google.com',
  'accounts.youtube.com',
  'appleid.apple.com',
  'idmsa.apple.com',
] as const;

export const ALLOWED_NAV_HOSTS = [
  'chatgpt.com',
  'chat.openai.com',
  'auth.openai.com',
  'openai.com',
  ...OAUTH_POPUP_HOSTS,
] as const;

const hostMatches = (
  host: string,
  allowedHosts: readonly string[],
): boolean =>
  allowedHosts.some(
    (allowedHost) =>
      host === allowedHost || host.endsWith(`.${allowedHost}`),
  );

const parseUrl = (rawUrl: string): URL | undefined => {
  try {
    return new URL(rawUrl);
  } catch {
    return undefined;
  }
};

const logDroppedUrl = (rawUrl: string): void => {
  if (!app.isPackaged) {
    console.warn(`[navigation] Dropped non-HTTP(S) URL: ${rawUrl}`);
  }
};

const openExternalUrl = (rawUrl: string): void => {
  const url = parseUrl(rawUrl);

  if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
    logDroppedUrl(rawUrl);
    return;
  }

  void shell.openExternal(url.toString()).catch((error: unknown) => {
    if (!app.isPackaged) {
      console.warn(`[navigation] Failed to open external URL: ${rawUrl}`, error);
    }
  });
};

export const attachNavigationPolicy = (contents: WebContents): void => {
  contents.on('will-navigate', (event) => {
    const url = parseUrl(event.url);

    if (url && hostMatches(url.hostname, ALLOWED_NAV_HOSTS)) {
      return;
    }

    event.preventDefault();
    openExternalUrl(event.url);
  });

  contents.setWindowOpenHandler(({ url: rawUrl }) => {
    const url = parseUrl(rawUrl);

    if (url && hostMatches(url.hostname, OAUTH_POPUP_HOSTS)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          webPreferences: {
            partition: CHATGPT_PARTITION,
            contextIsolation: true,
            sandbox: true,
            nodeIntegration: false,
          },
        },
      };
    }

    openExternalUrl(rawUrl);
    return { action: 'deny' };
  });
};
