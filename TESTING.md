# Testing Guide: dTAK Photo Markup Feature

This guide explains how to run, extend, and troubleshoot the unit tests for the dTAK photo markup capability. It aligns with the program’s offline-first, security, and quality engineering principles and is intended for cross-functional contributors.

## Overview

- Focus area files live under `lib/photo-markup/`.
- Tests live under `test/photo-markup/` and use Vitest.
- React Native dependencies are mocked to run in Node:
  - `react-native-vision-camera`, `react-native-geolocation-service`, `react-native-fs`, `react-native-canvas`, `@react-native-async-storage/async-storage`, `react-native-image-resizer`.
- Test config is in `vitest.config.ts`.

## Running Tests

- Run all tests:
  ```bash
  npm test -- --run
  ```
- Run only photo-markup tests:
  ```bash
  npm test -- --run test/photo-markup
  ```
- Run a single test file or a single test via `-t`:
  ```bash
  npm test -- --run test/photo-markup/PhotoMarkupManager.test.ts -t "Photo Capture"
  ```

## Test Structure

- `PhotoMarkupManager.test.ts`
  - Initialization, capture, annotation CRUD, undo/redo, storage, sharing, error handling, cleanup.
  - Background behaviors: auto-save debounce and auto-sync interval validation using fake timers.

- `MarkupCanvas.test.ts`
  - Canvas init, tools, drawing ops, coordinate transform, style application, exports.

- `OfflineStorageService.test.ts`
  - Storage, retrieval, encryption, stats, deletion.

- `TakPhotoIntegration.test.ts`
  - CoT creation, share, retry, incoming parsing.

## Mocks

- See `test/__mocks__/` for stubs. Key behaviors:
  - `react-native-fs`: provides `readFile`, `writeFile`, `mkdir`, `exists`, `unlink`.
  - `react-native-geolocation-service`: default export with `getCurrentPosition()`, `requestAuthorization()`.
  - `react-native-vision-camera`: permissive mock to avoid native calls.

Vitest aliasing in `vitest.config.ts` ensures these mocks are used.

## Common Issues and Fixes

- Missing fixtures (e.g., `QuickPic.zip`): tests auto-skip if not found.
- Floating-point precision: polygon assertions round values to 12 decimals.
- TypeScript strict mode:
  - Use type-only imports in library code when `verbatimModuleSyntax` is enabled.
  - Timer types should use `ReturnType<typeof setTimeout>` / `setInterval`.

## Adding New Tests

1. Place tests under `test/photo-markup/` and follow existing patterns.
2. If a new RN dependency is used, add a mock to `test/__mocks__/` and alias it in `vitest.config.ts`.
3. For background logic, use `vi.useFakeTimers()` and advance time deterministically.
4. Prefer resilient assertions (guard against precision or platform noise).

## Scenario Coverage (dTAK Alignment)

- Offline-first:
  - Capture when camera uninitialized → mock path and metadata created.
  - Save/Share retries and `retrySyncQueue()`.
- Security:
  - AES encryption mocks; verify encrypted fields are present and decrypt path executes.
- Performance:
  - Debounced auto-save; constrained I/O via RNFS mock; image resize mock.
- Interop:
  - TAK CoT XML generation/parse; mesh integration entry points stubbed.

## Extending to E2E

- Consider Detox/Appium suites for RN UI flows:
  - Permissions flows (camera, location).
  - Capture → annotate → save → share.
  - Network transitions (offline/online) and conflict resolution.

## Troubleshooting Checklist

- Ensure mocks expose default exports if code imports default RN modules.
- Reset singletons (`PhotoMarkupManager`) between tests if behavior depends on init sequence.
- If timers interfere across tests, revert to real timers in `afterEach`.

## Contacts

- Owners: dTAK engineering team.
- PRs should include test updates and mention impacts to mocks/config.
