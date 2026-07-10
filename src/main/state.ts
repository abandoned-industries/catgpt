import Store, { type Schema } from 'electron-store';

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UpdateNagPreferences {
  enabled: boolean;
  lastCheck?: number;
  lastNaggedVersion?: string;
}

export interface Preferences {
  globalHotkey: string;
  cssTweaks: Record<string, boolean>;
  updateNag: UpdateNagPreferences;
}

interface StateSchema {
  windowBounds?: WindowBounds;
  zoomLevel: number;
  prefs: Preferences;
}

const schema: Schema<StateSchema> = {
  windowBounds: {
    type: 'object',
    additionalProperties: false,
    properties: {
      x: { type: 'number' },
      y: { type: 'number' },
      width: { type: 'number', minimum: 1 },
      height: { type: 'number', minimum: 1 },
    },
    required: ['x', 'y', 'width', 'height'],
  },
  zoomLevel: { type: 'number' },
  prefs: {
    type: 'object',
    additionalProperties: false,
    properties: {
      globalHotkey: { type: 'string' },
      cssTweaks: {
        type: 'object',
        additionalProperties: { type: 'boolean' },
      },
      updateNag: {
        type: 'object',
        additionalProperties: false,
        properties: {
          enabled: { type: 'boolean' },
          lastCheck: { type: 'number' },
          lastNaggedVersion: { type: 'string' },
        },
        required: ['enabled'],
      },
    },
    required: ['globalHotkey', 'cssTweaks', 'updateNag'],
  },
};

const store = new Store<StateSchema>({
  schema,
  defaults: {
    zoomLevel: 0,
    prefs: {
      globalHotkey: 'Alt+Space',
      cssTweaks: {},
      updateNag: { enabled: true },
    },
  },
});

export const getWindowBounds = (): WindowBounds | undefined =>
  store.get('windowBounds');

export const setWindowBounds = (bounds: WindowBounds): void => {
  store.set('windowBounds', bounds);
};

export const getZoomLevel = (): number => store.get('zoomLevel');

export const setZoomLevel = (zoomLevel: number): void => {
  store.set('zoomLevel', zoomLevel);
};

export const getPreferences = (): Preferences => store.get('prefs');

export const setPreferences = (preferences: Preferences): void => {
  store.set('prefs', preferences);
};
