import { app, systemPreferences, type Session } from 'electron';

const CHATGPT_ORIGIN = 'https://chatgpt.com';

// Electron-level permission is not enough for audio capture: macOS TCC must
// also grant the microphone to this app. 'not-determined' → trigger the system
// prompt; 'denied'/'restricted' → capture yields silence, so refuse and log.
const ensureMicrophoneAccess = async (): Promise<boolean> => {
  const status = systemPreferences.getMediaAccessStatus('microphone');

  if (status === 'granted') {
    return true;
  }

  if (status === 'not-determined') {
    return systemPreferences.askForMediaAccess('microphone');
  }

  console.warn(
    `[permissions] macOS microphone access is "${status}" — enable this app in System Settings > Privacy & Security > Microphone`,
  );
  return false;
};

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
        callback(false);
        return;
      }

      if (permission === 'media') {
        void ensureMicrophoneAccess().then((microphoneGranted) => {
          if (!microphoneGranted) {
            logDenial('media (macOS microphone)', origin);
          }
          callback(microphoneGranted);
        });
        return;
      }

      callback(true);
    },
  );

  appSession.setPermissionCheckHandler(
    (_contents, permission, requestingOrigin, details) => {
      const origin = normalizeOrigin(
        details.securityOrigin ?? requestingOrigin,
      );
      // Checks (unlike requests) also arrive for device enumeration with no
      // mediaType; denying those hides input devices from the page, so only
      // an explicit 'video' check is refused.
      const allowed =
        isAllowedOrigin(origin) &&
        (permission === 'notifications' ||
          (permission === 'media' && details.mediaType !== 'video'));

      if (!allowed) {
        logDenial(permission, origin);
      }

      return allowed;
    },
  );
};
