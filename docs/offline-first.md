# Offline-First Patterns for dTAK React Native

This guide outlines recommended patterns to make tactical apps reliable in contested and disconnected environments.

## Core Principles

- Robust during network transitions (offline → online → flaky)
- Deterministic storage with resumable transfers and retries
- Conflict-aware sync across Mesh (Ditto) and TAK Server channels
- Efficient on-device performance (tiles, CoTs, attachments)
- Secure-by-default: encrypted at rest, least privilege

## Storage Strategy

- CoT, mission content, and attachments
  - Use `react-native-fs` for local persistence (`DocumentDirectoryPath`)
  - Keep metadata small and queryable; store large binaries as files
  - Use content-addressed paths (SHA256) to deduplicate

- Map tiles and basemaps
  - Store as MBTiles or z/x/y tile directories with simple LRU cache
  - Pre-download mission AOI with background jobs

## Transfer Resiliency

- Resumable downloads/uploads (HTTP range requests or multi-part S3)
- Exponential backoff with jitter, max retry policy, and pause/resume
- Verify integrity via SHA256 (use library `DataPackage.hash` for zips)
- Background task scheduling to continue when app is minimized

## Sync Across Mesh and TAK

- Prefer idempotent operations with stable UIDs
- Implement a conflict policy:
  - Last-write-wins for ephemeral data (e.g., presence)
  - Merge-by-field or CRDT for mission metadata (e.g., labels)
  - Attachment references deduped by file hash
- Maintain a per-item vector clock or timestamp + source for arbitration
- Ensure dedup between channels: if a CoT is received via mesh and TAK, collapse by UID + time window

## Data Packages (MissionPackageManifest)

- Parse with `DataPackage.parse()`; retain manifest and raw entries
- Use `attachments()` and `files()` APIs to separate attachments vs non-CoT files
- When generating packages, include a `MANIFEST/manifest.xml` and compute SHA256
- For large packages, zip in background with progress and cancellation

## Observability & Telemetry

- Emit events for:
  - Connectivity changes, retry attempts, and backoffs
  - Package parse success/failure and hash mismatches
  - CoT round-trip (xml ↔ protobuf) validation failures
- Buffer logs offline and upload later; avoid PII

## Security

- Encrypt sensitive local data at rest (keys in Keychain/Keystore)
- Validate all package manifests and CoTs using strict schemas
- Apply least-privilege permissions for file, network, camera, etc.
- Sanitize and bound XML parsing; reject malformed inputs

## Example: Resumable Download Sketch

```ts
async function robustDownload(url: string, destPath: string, fetchRange?: number) {
  // Pseudocode
  let start = fetchRange ?? 0;
  let attempts = 0;
  while (attempts < 5) {
    try {
      const res = await fetch(url, {
        headers: start ? { Range: `bytes=${start}-` } : undefined,
      });
      if (!res.ok && res.status !== 206 && start) throw new Error('Range not supported');

      const reader = res.body!.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        // append chunk to file at destPath
        // update `start` by value.length
      }
      // verify hash if available
      return destPath;
    } catch (err) {
      attempts++;
      const delay = Math.min(30000, 1000 * 2 ** attempts);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Failed to download after retries');
}
```

## QA Scenarios

- Toggle Airplane Mode during package download and confirm resumption
- Concurrent mesh and TAK reception of same CoT → dedup
- Corrupted zip or hash mismatch → safe failure and telemetry
- Large image/video attachment handling under memory constraints
