import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const SIGNING_IDENTITY =
  'Developer ID Application: Kazys Varnelis (PHCL25Z99X)';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: './assets/CatGPT',
    extraResource: ['./assets/about-ajman.png'],
    appBundleId: 'net.varnelis.catgpt',
    extendInfo: {
      CFBundleIconName: 'CatGPT',
      NSMicrophoneUsageDescription:
        'CatGPT needs the microphone for ChatGPT voice mode.',
    },
  },
  // Signing pulled forward from Phase 4: macOS TCC refuses to attribute the
  // microphone permission to an ad-hoc, teamless binary (the packager's fallback
  // even keeps the com.github.Electron identifier), so voice mode's system prompt
  // never fires. `packagerConfig.osxSign` was silently ignored by Forge here, so
  // we sign in a postPackage hook instead — deterministic and always applied.
  // Signed but NOT notarized (owner decision): locally-built bundles carry no
  // quarantine flag, so Gatekeeper launches them despite `spctl` assessment.
  hooks: {
    postPackage: async (_forgeConfig, { platform, outputPaths }) => {
      if (platform !== 'darwin') {
        return;
      }

      const appPath = path.join(outputPaths[0], 'CatGPT.app');
      const nativeIconOutputPath = path.resolve(
        process.cwd(),
        'out/icon-native',
      );
      const signer = path.resolve(
        process.cwd(),
        'node_modules/.bin/electron-osx-sign',
      );

      mkdirSync(nativeIconOutputPath, { recursive: true });
      execFileSync(
        'xcrun',
        [
          'actool',
          'assets/CatGPT.icon',
          '--compile',
          nativeIconOutputPath,
          '--platform',
          'macosx',
          '--minimum-deployment-target',
          '15.0',
          '--app-icon',
          'CatGPT',
          '--output-partial-info-plist',
          path.join(nativeIconOutputPath, 'partial.plist'),
        ],
        { stdio: 'inherit' },
      );
      copyFileSync(
        path.join(nativeIconOutputPath, 'Assets.car'),
        path.join(appPath, 'Contents/Resources/Assets.car'),
      );

      // electron-packager 18.4 writes its own CFBundleIconName ("Icon",
      // matching Electron's stock Assets.car) and it wins over extendInfo —
      // force ours so macOS 26 finds the CatGPT icon group in our car.
      execFileSync(
        '/usr/libexec/PlistBuddy',
        [
          '-c',
          'Set :CFBundleIconName CatGPT',
          path.join(appPath, 'Contents/Info.plist'),
        ],
        { stdio: 'inherit' },
      );

      execFileSync(
        signer,
        [
          appPath,
          `--identity=${SIGNING_IDENTITY}`,
          '--entitlements=packaging/entitlements.plist',
          '--hardened-runtime',
          '--type=distribution',
        ],
        { stdio: 'inherit' },
      );
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main/index.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
