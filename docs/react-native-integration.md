# React Native Integration Guide

This guide explains how to consume `@tak-ps/react-native-cot` in a React Native app and ensure reliable bundling of XML/Protobuf assets and RN-native filesystem/archive support.

## Install

- Install the library

```bash
npm install @tak-ps/react-native-cot
```

- Required peer/native dependencies

```bash
npm install react-native-fs react-native-zip-archive readable-stream react-native-path
```

iOS: run `cd ios && pod install` in your RN app.

## Metro configuration

If your app needs Node polyfills or to ensure XML/Proto assets are treated properly, extend your `metro.config.js`:

```js
// metro.config.js (in your RN app)
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {
  resolver: {
    alias: {
      path: 'react-native-path',
      stream: 'readable-stream',
    },
    assetExts: ['xml', 'proto'],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
```

Notes:
- The library already avoids Node-only APIs at runtime via an abstraction layer. The aliases above are helpful if your app uses Node-like modules.
- XML/Proto files are shipped in the package `dist/` and must be treated as RN assets during bundling.

## Usage

```ts
import { CoTParser } from '@tak-ps/react-native-cot';

async function createCot() {
  const feature = {
    type: 'Feature',
    id: 'sample-1',
    properties: {
      type: 'a-f-G-E',
      how: 'm-g',
      time: new Date().toISOString(),
      start: new Date().toISOString(),
      stale: new Date(Date.now() + 60_000).toISOString(),
      callsign: 'Alpha',
    },
    geometry: { type: 'Point', coordinates: [-104.99, 39.74, 0] },
  } as const;

  const cot = await CoTParser.from_geojson(feature);
  const xml = CoTParser.to_xml(cot);
  const protobuf = await CoTParser.to_proto(cot);
  const restored = await CoTParser.from_proto(protobuf);
}
```

## Filesystem and archives

- The library uses a unified FS layer:
  - React Native: `react-native-fs`
  - Node (tests/dev): native `fs`
- Zip creation/extraction:
  - React Native: `react-native-zip-archive`
  - Node (tests/dev): `archiver` and `node-stream-zip`

No app changes required beyond installing the native modules.

## iOS/Android notes

- iOS: ensure Pods are installed after adding native deps.
- Android: Gradle will auto-link RNFS and ZipArchive; if you use monorepo workspaces, confirm autolinking works or add manual configuration.

## Troubleshooting

- If Protobuf definitions are not loading in RN, ensure the package’s `dist/lib/proto/*.proto` are present and bundled. They are included by default in the published package. Metro must treat `.proto` as asset or text.
- If XML type definitions are missing, ensure `.xml` is included in `assetExts` and that the library version is built with those assets in `dist/` (default in this repo).

