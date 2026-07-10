import { app, session, type Session } from 'electron';

export const CHATGPT_PARTITION = 'persist:chatgpt';

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const chromeUserAgent = (): string => {
  const appToken = new RegExp(
    `\\s*${escapeRegExp(app.getName())}\\/[^\\s]+`,
    'gi',
  );

  return app.userAgentFallback
    .replace(/\s*Electron\/[^\s]+/gi, '')
    .replace(appToken, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

export const configureAppSession = (): Session => {
  const appSession = session.fromPartition(CHATGPT_PARTITION);
  const userAgent = chromeUserAgent();

  if (!app.isPackaged) {
    console.log(`[session] UA: ${userAgent}`);
  }

  appSession.setUserAgent(userAgent);
  return appSession;
};
