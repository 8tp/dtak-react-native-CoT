# TAK Interoperability Guide

This document describes how the dTAK React Native CoT library interoperates with TAK ecosystems (ATAK, iTAK, WinTAK, TAK Server) and how to implement robust exchanges of CoTs, Mission Packages, and attachments.

## CoT Interoperability

- __CoT XML__: Use `CoTParser.to_xml()` and `CoTParser.from_xml()` to convert between internal objects and TAK-compliant XML.
- __CoT Protobuf__: Use `CoTParser.to_proto()` and `CoTParser.from_proto()` for efficient, binary CoT transport.
- __GeoJSON Bridge__: `CoTParser.from_geojson()` and `CoTParser.to_geojson()` simplify creating and inspecting CoTs from geospatial data.
- __Preserved Detail__: The library preserves styling, archive flags, and shapes through XML ↔ Protobuf round-trips.

## Mission Packages (Data Packages)

TAK uses MissionPackageManifest (manifest.xml) to bind CoTs, files, and attachments in a zip.

- __Read__: `DataPackage.parse(zipPath)` extracts contents and validates the manifest (strict mode).
- __Inspect__: `cots()`, `attachments()`, and `files()` distinguish CoTs, CoT-linked attachments, and regular files.
- __Write__: Build new packages with `addCoT()`, `addFile()`, and call `finalize()` to produce a zip with `MANIFEST/manifest.xml`.
- __Hash__: `DataPackage.hash(path)` computes the EUD-style SHA256, commonly used by TAK Server for integrity.
- __Mission Archives__: `isMissionArchive()` detects MissionSync archive exports.

## TAK Server Integration

- __Auth__: Use TAK Server authentication (e.g., mutual TLS or token-based) per your deployment policy. The library does not manage auth; integrate via your HTTP/WebSocket client.
- __Publish__: Send CoT XML or Protobuf over TAK Server data channels or REST endpoints (e.g., Marti APIs). The library ensures CoT compliance.
- __Subscribe__: Parse incoming CoTs with `from_xml()`/`from_proto()` and bridge to your app model via `to_geojson()`.
- __Mission Content__: Upload/download Mission Packages via TAK Server endpoints. Validate manifests and compute hashes using `DataPackage` APIs.

## Attachments

- __LINKING__: In manifests, attachments are associated to CoTs via `Parameter name="uid" value="<cotUid>"` on the content entry.
- __ATTACHMENT LIST__: The library reconstructs `attachment_list` and appends hashed references. Use `attachments()` to discover non-CoT assets bound to a CoT.
- __INTEGRITY__: Use `DataPackage.hash(entry)` to compute hashes for inclusion in attachment lists and verification.

## Compatibility Notes

- __ATAK/iTAK/WinTAK__: CoT round-trip tested for styles, shapes, and archive semantics. Unknown detail is preserved as XML detail.
- __XML/Proto Assets__: The package ships `.xml` and `.proto` definitions in `dist/` and can be bundled by RN Metro. Ensure `assetExts` covers `xml` and `proto` when necessary.
- __React Native FS/Zip__: At runtime on device, `react-native-fs` and `react-native-zip-archive` are used. Node alternatives are used only in tests/dev.

## Best Practices

- __UID Stability__: Keep CoT `uid` stable to deduplicate across TAK Server and mesh channels.
- __Staleness__: Maintain proper `time`, `start`, and `stale` windowing for predictable presence and retention behavior.
- __Security__: Validate all inbound manifests and CoTs; sanitize XML; employ least-privilege credentials and encrypted stores for sensitive data.
- __Observability__: Emit telemetry on parse, hash mismatch, package creation, and send/receive events for troubleshooting in the field.

## Example: Parsing a Mission Package

```ts
import { DataPackage } from '@tak-ps/react-native-cot';

async function parseMissionPackage(zipPath: string) {
  const pkg = await DataPackage.parse(zipPath, { strict: true, cleanup: false });

  const cots = await pkg.cots();
  const attachments = await pkg.attachments();
  const files = await pkg.files();

  console.log('CoTs', cots.length);
  console.log('Attachments by UID', attachments);
  console.log('Other files', files);

  await pkg.destroy();
}
```

## Example: Uploading a Mission Package to TAK Server

The specifics depend on your TAK Server deployment (auth, endpoints). This uses a typical Marti-compatible endpoint and bearer/mTLS as placeholders.

```ts
import { DataPackage } from '@tak-ps/react-native-cot';

async function uploadMissionPackage(zipPath: string, takUrl: string, token: string) {
  // Validate hash before upload
  const hash = await DataPackage.hash(zipPath);

  const body = new FormData();
  // RN fetch supports file:// URIs via { uri, type, name }
  body.append('file', {
    uri: `file://${zipPath}`,
    type: 'application/zip',
    name: `mission-${hash}.zip`,
  } as unknown as Blob);

  const res = await fetch(`${takUrl}/Marti/some/upload/endpoint`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  if (!res.ok) throw new Error(`TAK upload failed: ${res.status}`);
  return await res.text();
}
```

## Example: Download and Parse a Package from TAK Server

```ts
import RNFS from 'react-native-fs';
import { DataPackage } from '@tak-ps/react-native-cot';

async function downloadAndParse(takUrl: string, missionId: string, token: string) {
  const tmpZip = `${RNFS.TemporaryDirectoryPath}/mission-${missionId}.zip`;

  const res = await fetch(`${takUrl}/Marti/some/download/${missionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);

  const buf = await res.arrayBuffer();
  await RNFS.writeFile(tmpZip, Buffer.from(buf).toString('base64'), 'base64');

  const pkg = await DataPackage.parse(tmpZip, { strict: true, cleanup: false });
  const cots = await pkg.cots();
  const attachments = await pkg.attachments();
  await pkg.destroy();
  return { cots, attachments };
}
```

## Mesh Sync (Ditto) Sketch

Below is a conceptual example of syncing CoTs via Ditto. Integrate with your Ditto SDK version and security model.

```ts
// Pseudocode (Ditto API varies by SDK version)
import { CoTParser } from '@tak-ps/react-native-cot';

type CotEnvelope = { uid: string; xml?: string; proto?: Uint8Array; timestamp: number };

// Publish local CoT changes
async function publishCot(ditto: any, cot: any) {
  const xml = CoTParser.to_xml(cot);
  await ditto.collection('cots').upsert({ uid: cot.uid(), xml, timestamp: Date.now() });
}

// Subscribe to remote updates and dedupe by uid + time window
function subscribeCots(ditto: any, onCot: (cot: any) => void) {
  ditto.collection('cots').liveQuery(async (change: { doc: CotEnvelope }) => {
    const { xml } = change.doc;
    if (!xml) return;
    const cot = CoTParser.from_xml(xml);
    // Optional: check last-seen map to avoid duplicate processing
    onCot(cot);
  });
}

// Conflict resolution
// Maintain last-write wins for presence; merge-by-field for mission metadata (if using CRDTs)
```
