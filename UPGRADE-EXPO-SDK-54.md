# Upgrade to Expo SDK 54 (Examples Only)

This repository is a React Native library (`@tak-ps/react-native-cot`) with example apps. The Expo-managed example at `examples/react-native-map/` has been upgraded to Expo SDK 54, which aligns with React Native 0.81 and React 19.1.

SDK 54 helps us validate dTAK mapping features on current platform tooling while preserving offline-first reliability and performance.

## What changed

- Updated `examples/react-native-map/package.json` dependencies:
  - expo: ^54.0.0
  - react: 19.1.0
  - react-dom: 19.1.0
  - react-native: 0.81.0
  - react-native-web: ~0.19.13
  - react-native-maps: ^1.26.0 (compatible with RN 0.81)
  - dev: typescript ~5.6.2
  - engines: node >=20.19.4 (Expo 54 requirement)
- Removed `expo-status-bar` (not used) and `@types/react` (React 19 includes types).
- Removed `sdkVersion` from `examples/react-native-map/app.json` (Expo derives it from installed `expo`).
- Kept Hermes JS engine enabled (default on SDK 54, JSC first-party support removed in RN 0.81).

## Why these changes

- Expo SDK 54 pairs with React Native 0.81 and React 19.1, improving build speed, Android edge-to-edge behavior, and platform support.
- Minimum Node is 20.19.4 per Expo 54 tooling.
- `react-native-maps` needed to be bumped to avoid 0.81 regressions; `^1.26.0` contains fixes for Android crashes on RN 0.81.x.

## Potential breaking changes and risks

- Reanimated v4 requires the New Architecture. This example does not use Reanimated; if you introduce it later, follow the official migration guide for SDK 54.
- JSC is no longer bundled by RN 0.81. Hermes is used by default; if you must use JSC, you will need community packages and custom config.
- Metro internal import paths changed in `metro@0.83`. We only use public APIs via `expo/metro-config`.

## Validate the upgrade

From repository root:

```sh
# 1) Build the library (ensures dist/ is available for the example)
npm run build

# 2) Install and check the Expo example
auth node --version   # ensure Node >= 20.19.4
cd examples/react-native-map
npm install
npx expo doctor --fix

# 3) Run the app
yarn start             # or: npm start / npx expo start
# Press: i (iOS), a (Android), w (Web)
```

If you see dependency warnings, run:

```sh
npx expo install --fix
```

## Functionality to verify

- Map renders and pans/zooms smoothly on iOS and Android Simulators.
- CoT overlays (point, polyline, polygon) render with expected colors and callouts.
- Web build starts and shows a basic map (react-native-web ~0.19.13).
- No crashes related to `react-native-maps` on RN 0.81.

## dTAK quality considerations

- Offline-first: verify the example continues to function with intermittent connectivity (tiles from Apple/Google depend on network; app should degrade gracefully).
- Security & compliance: no sensitive keys are embedded; example uses default maps only.
- Performance: profile map rendering when plotting multiple overlays; batch state updates when integrating real CoT feeds.
- Testing: keep unit tests in the library passing (`npm test` at root). Consider adding a smoke test for the example if you extend it.

## Rollback

If you need to revert the Expo example to SDK 51–53 for comparison or CI constraints, revert changes to `examples/react-native-map/{package.json,app.json}` and reinstall. Keep in mind React 19 to 18 downgrades also require `@types/react` reintroduction and `react-native-maps` version adjustments.
