/**
 * TakPhotoIntegration Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TakPhotoIntegration } from '../../lib/photo-markup/TakPhotoIntegration';
import type { MarkedUpPhoto, ShareOptions } from '../../lib/photo-markup/types';
import { CoTParser } from '../../lib/parser';

// Mocks
vi.mock('react-native-fs', () => ({
  default: {
    DocumentDirectoryPath: '/mock/documents',
    readFile: vi.fn(async () => 'R0lGODlhAQABAAAAACw='),
    writeFile: vi.fn(async () => { /* ok */ })
  }
}));

vi.mock('crypto-js', async (importOriginal) => {
  const mod = await importOriginal<any>();
  return {
    default: mod.default,
    AES: {
      encrypt: vi.fn(() => ({ toString: () => 'enc' })),
      decrypt: vi.fn(() => ({ toString: () => 'dec' }))
    },
    enc: { Utf8: 'Utf8' }
  };
});

const makePhoto = (): MarkedUpPhoto => ({
  id: 'm1',
  photo: {
    id: 'p1',
    uri: '/mock/p.jpg',
    width: 1920,
    height: 1080,
    fileSize: 1000,
    mimeType: 'image/jpeg',
    timestamp: Date.now(),
    location: { latitude: 40.0, longitude: -105.0, altitude: 0, accuracy: 5, timestamp: Date.now() }
  },
  annotations: [
    {
      id: 'a1', type: 'circle', coordinates: [100, 100, 20],
      style: { strokeColor: '#f00', strokeWidth: 2, opacity: 1 }, timestamp: Date.now(), author: 't'
    }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  author: 'tester',
  shared: false,
  syncStatus: 'pending'
});

const shareOpts: ShareOptions = {
  includeLocation: true,
  compressionQuality: 0.8,
  priority: 'normal'
};

describe('TakPhotoIntegration', () => {
  let tak: TakPhotoIntegration;

  beforeEach(() => {
    tak = TakPhotoIntegration.getInstance();
    tak.configureTakServer({ serverUrl: 'https://tak.example', username: 'user' });
    tak.configureMeshNetwork({ nodeId: 'n1', networkName: 'mesh' });
  });

  it('creates a CoT from a marked up photo', () => {
    const p = makePhoto();
    const cot = tak.createPhotoCoT(p);
    const xml = CoTParser.to_xml(cot);
    expect(xml).toContain('<event');
    const detail: any = cot.raw.event.detail;
    expect(detail?.image).toBeDefined();
  });

  it('shares photo and updates status', async () => {
    const p = makePhoto();
    const ok = await tak.sharePhoto(p, shareOpts);
    expect(ok).toBe(true);
    expect(p.shared).toBe(true);
    expect(p.syncStatus).toBe('synced');
  });

  it('handles share failures and retries', async () => {
    const p = makePhoto();
    // Force readFile to throw once
    const rnfs = await import('react-native-fs');
    (rnfs.default.readFile as any).mockImplementationOnce(async () => { throw new Error('fs'); });

    await expect(tak.sharePhoto(p, shareOpts)).rejects.toThrow();
    expect(p.syncStatus).toBe('failed');

    // Now make read succeed and retry
    await tak.retrySyncQueue();
  });

  it('processes incoming photo CoT XML', async () => {
    const p = makePhoto();
    const cot = tak.createPhotoCoT(p);
    const xml = CoTParser.to_xml(cot);
    const result = await tak.processIncomingPhoto(xml);
    expect(result).not.toBeNull();
    expect(result?.photo.uri).toBeDefined();
  });
});
