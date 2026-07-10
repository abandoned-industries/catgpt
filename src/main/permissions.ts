import { app, type Session } from 'electron';

const CHATGPT_ORIGIN = 'https://chatgpt.com';

const normalizeOrigin = (value: string): string => {
  try {
    return new URL(value).origin;
  } catch {
    return value || '<unknown origin>';
  }
};

const isAllowedOrigin = (origin: string): boolean =>
  normalizeOrigin(origin) === CHATGPT_ORIGIN;

const logDenial = (permission: string, origin: string): void => {
  if (!app.isPackaged) {
    console.warn(`[permissions] Denied ${permission} for ${origin}`);
  }
};

export const configurePermissions = (appSession: Session): void => {
  appSession.setPermissionRequestHandler(
    (_contents, permission, callback, details) => {
      const securityOrigin =
        'securityOrigin' in details && details.securityOrigin
          ? details.securityOrigin
          : details.requestingUrl;
      const origin = normalizeOrigin(securityOrigin);
      const mediaTypes =
        'mediaTypes' in details ? details.mediaTypes : undefined;
      const audioOnly =
        mediaTypes !== undefined &&
        mediaTypes.length > 0 &&
        mediaTypes.every((mediaType) => mediaType === 'audio');
      const allowed =
        isAllowedOrigin(origin) &&
        (permission === 'notifications' ||
          (permission === 'media' && audioOnly));

      if (!allowed) {
        logDenial(permission, origin);
      }

      callback(allowed);
    },
  );

  appSession.setPermissionCheckHandler(
    (_contents, permission, requestingOrigin, details) => {
      const origin = normalizeOrigin(
        details.securityOrigin ?? requestingOrigin,
      );
      const allowed =
        isAllowedOrigin(origin) &&
        (permission === 'notifications' ||
          (permission === 'media' && details.mediaType === 'audio'));

      if (!allowed) {
        logDenial(permission, origin);
      }

      return allowed;
    },
  );
};
