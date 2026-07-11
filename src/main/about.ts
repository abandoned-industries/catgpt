import { app } from 'electron';
import path from 'node:path';

const getAboutIconPath = (): string =>
  app.isPackaged
    ? path.join(process.resourcesPath, 'about-ajman.png')
    : path.resolve(process.cwd(), 'assets/about-ajman.png');

export const configureAboutPanel = (): void => {
  app.setAboutPanelOptions({
    applicationName: 'CatGPT',
    applicationVersion: app.getVersion(),
    iconPath: getAboutIconPath(),
    credits:
      'For Ajman, the cat god. 🐈‍⬛\nUnofficial desktop wrapper for ChatGPT.com. Not affiliated with, endorsed by, or sponsored by OpenAI.\nCatGPT collects no data — everything goes directly to ChatGPT.com.',
    copyright: '© 2026 Abandoned Industries · MIT License',
  });
};
