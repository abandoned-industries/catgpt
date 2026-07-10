import { existsSync } from 'node:fs';
import path from 'node:path';

import {
  app,
  Notification,
  shell,
  type DownloadItem,
  type Session,
} from 'electron';

import type { MainWindowResolver } from './window';

interface DownloadProgress {
  receivedBytes: number;
  totalBytes: number;
}

const uniqueDownloadPath = (
  filename: string,
  reservedPaths: ReadonlySet<string>,
): string => {
  const downloadsDirectory = app.getPath('downloads');
  const safeFilename = path.basename(filename) || 'download';
  const parsed = path.parse(safeFilename);
  let suffix = 0;
  let candidate: string;

  do {
    const numberedName =
      suffix === 0
        ? safeFilename
        : `${parsed.name} (${suffix})${parsed.ext}`;
    candidate = path.join(downloadsDirectory, numberedName);
    suffix += 1;
  } while (existsSync(candidate) || reservedPaths.has(candidate));

  return candidate;
};

const updateDockProgress = (
  resolveMainWindow: MainWindowResolver,
  activeDownloads: ReadonlyMap<DownloadItem, DownloadProgress>,
): void => {
  const handle = resolveMainWindow();

  if (!handle || handle.window.isDestroyed()) {
    return;
  }

  if (activeDownloads.size === 0) {
    handle.window.setProgressBar(-1);
    return;
  }

  const progress = [...activeDownloads.values()];

  if (progress.some(({ totalBytes }) => totalBytes <= 0)) {
    handle.window.setProgressBar(2);
    return;
  }

  const receivedBytes = progress.reduce(
    (sum, item) => sum + item.receivedBytes,
    0,
  );
  const totalBytes = progress.reduce((sum, item) => sum + item.totalBytes, 0);
  handle.window.setProgressBar(
    Math.min(1, Math.max(0, receivedBytes / totalBytes)),
  );
};

const showFailureNotification = (filename: string): void => {
  new Notification({
    title: 'Download failed',
    body: `CatGPT could not download ${filename}.`,
  }).show();
};

export const attachDownloadHandling = (
  appSession: Session,
  resolveMainWindow: MainWindowResolver,
): void => {
  const activeDownloads = new Map<DownloadItem, DownloadProgress>();
  const reservedPaths = new Set<string>();

  appSession.on('will-download', (_event, item) => {
    const savePath = uniqueDownloadPath(item.getFilename(), reservedPaths);
    reservedPaths.add(savePath);
    item.setSavePath(savePath);

    const refreshProgress = (): void => {
      activeDownloads.set(item, {
        receivedBytes: item.getReceivedBytes(),
        totalBytes: item.getTotalBytes(),
      });
      updateDockProgress(resolveMainWindow, activeDownloads);
    };

    refreshProgress();
    item.on('updated', refreshProgress);
    item.once('done', (_doneEvent, state) => {
      activeDownloads.delete(item);
      reservedPaths.delete(savePath);
      updateDockProgress(resolveMainWindow, activeDownloads);

      if (state === 'completed') {
        app.dock?.downloadFinished(savePath);
        shell.showItemInFolder(savePath);
        return;
      }

      showFailureNotification(path.basename(savePath));
    });
  });
};
