import { app, globalShortcut } from 'electron';

import { getPreferences } from './state';
import type { MainWindowResolver } from './window';

const logRegistrationFailure = (
  accelerator: string,
  error?: unknown,
): void => {
  if (!app.isPackaged) {
    console.warn(
      `[hotkey] Could not register global shortcut: ${accelerator}`,
      error ?? '',
    );
  }
};

const summon = (resolveMainWindow: MainWindowResolver): void => {
  const handle = resolveMainWindow();

  if (!handle || handle.window.isDestroyed()) {
    return;
  }

  const { window } = handle;

  if (window.isVisible() && window.isFocused()) {
    window.hide();
    return;
  }

  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  window.show();
  app.focus({ steal: true });
  window.focus();

  setTimeout(() => {
    if (!window.isDestroyed()) {
      window.setVisibleOnAllWorkspaces(false);
    }
  }, 0);
};

export const registerGlobalHotkey = (
  resolveMainWindow: MainWindowResolver,
): string => {
  const accelerator = getPreferences().globalHotkey;

  try {
    const registered = globalShortcut.register(accelerator, () => {
      summon(resolveMainWindow);
    });

    if (!registered) {
      logRegistrationFailure(accelerator);
    }
  } catch (error: unknown) {
    logRegistrationFailure(accelerator, error);
  }

  return accelerator;
};

export const unregisterGlobalHotkey = (accelerator: string): void => {
  globalShortcut.unregister(accelerator);
};
