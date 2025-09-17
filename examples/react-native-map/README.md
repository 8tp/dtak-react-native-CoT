# React Native CoT Map Example

This Expo application demonstrates how to visualize TAK Cursor-on-Target (CoT) traffic on a mobile map using [`@tak-ps/react-native-cot`](../../index.ts). Incoming XML messages are parsed with the library and rendered with [`react-native-maps`](https://github.com/react-native-maps/react-native-maps).

## Getting started

```sh
# from repository root, build the library first
npm run build

# then install and start the example app
cd examples/react-native-map
npm install
npm start
```

The local dependency on `@tak-ps/react-native-cot` is resolved through `file:../..`. Metro is configured to watch the workspace root via `metro.config.cjs`, so hot reload works without additional symlinks.

When the Metro bundler opens you can press:

- `i` to run on iOS Simulator
- `a` to run on Android emulator
- `w` for the experimental web build

## What the demo shows

- Parsing CoT XML with `CoTParser.from_xml`
- Converting to GeoJSON via `CoTParser.to_geojson`
- Rendering CoT overlays (point, route, and perimeter) on top of `MapView`
- Focusing map camera and showing metadata for each overlay

You can now replace the sample messages in `App.tsx` with live traffic or a TAK server feed.
