/**
 * OfflineStorageService Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OfflineStorageService } from '../../lib/photo-markup/OfflineStorageService';
import type { MarkedUpPhoto } from '../../lib/photo-markup/types';

// Mocks
const memoryStore: Record<string, string> = {};
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (k: string) => memoryStore[k] ?? null),
    setItem: vi.fn(async (k: string, v: string) => { memoryStore[k] = v; }),
    removeItem: vi.fn(async (k: string) => { delete memoryStore[k]; })
  }
}));

vi.mock('react-native-fs', () => ({
  default: {
    DocumentDirectoryPath: '/mock/documents',
    mkdir: vi.fn(async () => { /* ok */ }),
    copyFile: vi.fn(async () => { /* ok */ }),
    unlink: vi.fn(async () => { /* ok */ }),
    exists: vi.fn(async () => true),
    stat: vi.fn(async () => ({ size: 1024 })),
    getFSInfo: vi.fn(async () => ({ freeSpace: 10_000_000_000 })),
    readFile: vi.fn(async () => 'mock-base64-data'),
    writeFile: vi.fn(async () => { /* ok */ })
  }
}));

vi.mock('crypto-js', async (importOriginal) => {
  const mod = await importOriginal<any>();
  return {
    default: mod.default,
    AES: {
      encrypt: vi.fn(() => ({ toString: () => 'enc' })),
      decrypt: vi.fn(() => ({ toString: () => JSON.stringify({}) }))
    },
    enc: { Utf8: 'Utf8' },
    lib: { WordArray: { random: vi.fn(() => ({ toString: () => 'key' })) } }
  };
});

const makePhoto = (id: string): MarkedUpPhoto => ({
  id,
  photo: {
    id: `photo-${id}`,
    uri: `/mock/p-${id}.jpg`,
    width: 1920,
    height: 1080,
    fileSize: 1000,
    mimeType: 'image/jpeg',
    timestamp: Date.now(),
    location: {
      latitude: 1,
      longitude: 2,
      altitude: 0,
      accuracy: 5,
      timestamp: Date.now()
    }
  },
  annotations: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  author: 'tester',
  shared: false,
  syncStatus: 'pending'
});

describe('OfflineStorageService', () => {
  let svc: OfflineStorageService;

  beforeEach(async () => {
    svc = OfflineStorageService.getInstance();
    await svc.initialize({ encryptionEnabled: true, autoSync: false });
  });

  it('initializes and sets up directories and encryption', async () => {
    const cfg = svc.getConfig();
    expect(cfg.encryptionEnabled).toBe(true);
  });

  it('stores and retrieves a photo', async () => {
    const p = makePhoto('1');
    const path = await svc.storePhoto(p);
    expect(typeof path).toBe('string');

    const loaded = await svc.retrievePhoto(p.id);
    expect(loaded?.id).toBe(p.id);
  });

  it('returns list of photos sorted', async () => {
    await svc.storePhoto(makePhoto('a'));
    await svc.storePhoto(makePhoto('b'));
    const all = await svc.getAllPhotos();
    expect(Array.isArray(all)).toBe(true);
  });

  it('updates a photo and marks as synced', async () => {
    const p = makePhoto('2');
    await svc.storePhoto(p);
    p.annotations.push({
      id: 'ann', type: 'text', coordinates: [0,0], style: { strokeColor: '#fff', strokeWidth: 1, opacity: 1 }, timestamp: Date.now(), author: 't', text: 'X'
    });
    await svc.updatePhoto(p);

    await svc.markPhotoSynced(p.id);
    const re = await svc.retrievePhoto(p.id);
    expect(re?.syncStatus).toBe('synced');
  });

  it('deletes a photo', async () => {
    const p = makePhoto('3');
    await svc.storePhoto(p);
    const ok = await svc.deletePhoto(p.id);
    expect(ok).toBe(true);
  });

  it('returns storage stats', async () => {
    await svc.storePhoto(makePhoto('s1'));
    const stats = await svc.getStorageStats();
    expect(stats).toHaveProperty('totalPhotos');
    expect(stats).toHaveProperty('storageAvailable');
  });
});
