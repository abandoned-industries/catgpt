import { app, type Session } from 'electron';

const permissionAllowlist = new Map<string, ReadonlySet<string>>();

const normalizeOrigin = (value: string): string => {
  try {
    return new URL(value).origin;
  } catch {
    return value || '<unknown origin>';
  }
};

const isPermissionAllowed = (origin: string, permission: string): boolean =>
  permissionAllowlist.get(origin)?.has(permission) ?? false;

const logDenial = (permission: string, origin: string): void => {
  if (!app.isPackaged) {
    console.warn(`[permissions] Denied ${permission} for ${origin}`);
  }
};

export const configurePermissions = (appSession: Session): void => {
  appSession.setPermissionRequestHandler(
    (_contents, permission, callback, details) => {
      const origin = normalizeOrigin(details.requestingUrl);
      const allowed = isPermissionAllowed(origin, permission);

      if (!allowed) {
        logDenial(permission, origin);
      }

      callback(allowed);
    },
  );

  appSession.setPermissionCheckHandler(
    (_contents, permission, requestingOrigin) => {
      const origin = normalizeOrigin(requestingOrigin);
      const allowed = isPermissionAllowed(origin, permission);

      if (!allowed) {
        logDenial(permission, origin);
      }

      return allowed;
    },
  );
};
