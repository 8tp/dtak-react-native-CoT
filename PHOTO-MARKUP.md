# dTAK Photo Markup Feature

This document describes how to use the geo‑tagged photo capture and markup module added to this repository. The feature is designed using offline‑first principles and aligns with mission collaboration workstreams (CH-1 – CH-5, TP-1 – TP-4).

## Capabilities

- Capture photos with device camera and automatic geo‑tagging
- Draw circles, arrows, rectangles, freehand, or add text
- Save locally with encryption and thumbnails
- Share via TAK Server or mesh networking (Ditto SDK integration point)
- Auto‑retry syncing and background resiliency

## Modules

- `lib/photo-markup/PhotoCaptureService.ts` – Camera + geo‑tagging
- `lib/photo-markup/MarkupCanvas.ts` – Drawing tools and rendering
- `lib/photo-markup/OfflineStorageService.ts` – Encrypted offline storage
- `lib/photo-markup/TakPhotoIntegration.ts` – CoT message creation and sharing
- `lib/photo-markup/PhotoMarkupManager.ts` – Orchestrates capture → annotate → store → share

## Quick Start

```ts
import { PhotoMarkupManager } from '@tak-ps/react-native-cot/lib/photo-markup';

const mgr = PhotoMarkupManager.getInstance();
await mgr.initialize({
  autoSave: true,
  autoSync: true,
  storage: { encryptionEnabled: true }
});

// 1) Capture a photo
await mgr.capturePhoto({ quality: 0.8, includeLocation: true });

// 2) Add an annotation
const tools = mgr.getAvailableTools();
mgr.setTool(tools.find(t => t.type === 'arrow')!);
// Create your annotation from UI coordinates via MarkupCanvas or build programmatically

// 3) Save locally
const path = await mgr.savePhoto('my-callsign');

// 4) Share
await mgr.configureTakServer({ serverUrl: 'https://tak.example', username: 'user' });
await mgr.sharePhoto(mgr.getState().currentPhoto!.id, {
  includeLocation: true,
  compressionQuality: 0.8,
  priority: 'normal'
});
```

## RN Integration Notes

- Requires native packages: `react-native-vision-camera`, `react-native-geolocation-service`, `react-native-fs`, `react-native-image-resizer`, `react-native-canvas`.
- Request permissions for camera and location on first use.
- `types/shims.d.ts` provides TypeScript shims for running tests in Node.

## Security Considerations

- Encryption at rest is supported via `OfflineStorageService` using AES (CryptoJS).
- Do not embed credentials. Use secure keystore or keychain for sensitive data.

## Testing

- Unit tests live under `test/photo-markup/`.
- Tests mock RN modules; no device required.

## Future Work

- Integrate Ditto SDK for P2-1 – P2-4 mesh sync
- Add EXIF write‑back for location
- Provide a React Native UI kit (toolbars, gestures) wrapping `MarkupCanvas`
