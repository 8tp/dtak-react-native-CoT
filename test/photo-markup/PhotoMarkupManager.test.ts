/**
 * PhotoMarkupManager Tests
 * Comprehensive test suite for the dTAK photo markup feature
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PhotoMarkupManager } from '../../lib/photo-markup/PhotoMarkupManager';
import { MarkupCanvas } from '../../lib/photo-markup/MarkupCanvas';
import type { PhotoMetadata, MarkupAnnotation, MarkedUpPhoto } from '../../lib/photo-markup/types';
import { PhotoMarkupError } from '../../lib/photo-markup/types';

// Mock dependencies
vi.mock('react-native-vision-camera', () => ({
    Camera: vi.fn(),
    useCameraDevice: vi.fn(() => ({ id: 'mock-camera' })),
    useCameraPermission: vi.fn(() => ({ hasPermission: true, requestPermission: vi.fn(() => true) }))
}));

vi.mock('react-native-geolocation-service', () => ({
    default: {
        getCurrentPosition: vi.fn((success) => {
            success({
                coords: {
                    latitude: 37.7749,
                    longitude: -122.4194,
                    altitude: 10,
                    accuracy: 5
                },
                timestamp: Date.now()
            });
        }),
        requestAuthorization: vi.fn(() => Promise.resolve('granted'))
    }
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
    default: {
        getItem: vi.fn(() => Promise.resolve(null)),
        setItem: vi.fn(() => Promise.resolve()),
        removeItem: vi.fn(() => Promise.resolve())
    }
}));

vi.mock('react-native-fs', () => ({
    default: {
        DocumentDirectoryPath: '/mock/documents',
        mkdir: vi.fn(() => Promise.resolve()),
        copyFile: vi.fn(() => Promise.resolve()),
        unlink: vi.fn(() => Promise.resolve()),
        exists: vi.fn(() => Promise.resolve(true)),
        stat: vi.fn(() => Promise.resolve({ size: 1024 })),
        getFSInfo: vi.fn(() => Promise.resolve({ freeSpace: 1000000000 })),
        readFile: vi.fn(() => Promise.resolve('mock-base64-data'))
    }
}));

describe('PhotoMarkupManager', () => {
    let manager: PhotoMarkupManager;
    let mockPhoto: PhotoMetadata;
    let mockAnnotation: MarkupAnnotation;

    beforeEach(async () => {
        manager = PhotoMarkupManager.getInstance();
        
        mockPhoto = {
            id: 'test-photo-1',
            uri: '/mock/photo.jpg',
            width: 1920,
            height: 1080,
            fileSize: 2048000,
            mimeType: 'image/jpeg',
            timestamp: Date.now(),
            location: {
                latitude: 37.7749,
                longitude: -122.4194,
                altitude: 10,
                accuracy: 5,
                timestamp: Date.now()
            }
        };

        mockAnnotation = {
            id: 'test-annotation-1',
            type: 'circle',
            coordinates: [100, 100, 50],
            style: {
                strokeColor: '#FF0000',
                strokeWidth: 3,
                opacity: 1
            },
            timestamp: Date.now(),
            author: 'test-user'
        };

        await manager.initialize({
            autoSave: false,
            autoSync: false
        });
    });

    describe('Background Behaviors', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
            vi.restoreAllMocks();
        });

        it('debounces auto-save to avoid excessive writes', async () => {
            (manager as any).config.autoSave = true;
            (manager as any).state.currentPhoto = mockPhoto;
            const saveSpy = vi.spyOn(manager, 'savePhoto').mockResolvedValue('/mock/saved.jpg');

            // Rapid successive annotations
            manager.addAnnotation({ ...mockAnnotation, id: 'a1' });
            manager.addAnnotation({ ...mockAnnotation, id: 'a2' });
            manager.addAnnotation({ ...mockAnnotation, id: 'a3' });

            // Before debounce window ends, save should not be called
            vi.advanceTimersByTime(1990);
            expect(saveSpy).not.toHaveBeenCalled();

            // After debounce window, exactly one save should occur
            vi.advanceTimersByTime(20);
            expect(saveSpy).toHaveBeenCalledTimes(1);
        });

        it('auto-sync runs on configured interval when enabled', async () => {
            // Re-initialize manager with autoSync enabled and small interval
            await manager.cleanup();
            const retrySpy = vi.spyOn((PhotoMarkupManager as any).instance, 'retrySyncQueue').mockResolvedValue(void 0);
            await manager.initialize({ autoSync: true, syncInterval: 500 });

            vi.advanceTimersByTime(1500); // should fire ~3 times
            expect(retrySpy).toHaveBeenCalled();

            await manager.cleanup();
        });
    });

    afterEach(async () => {
        await manager.cleanup();
    });

    describe('Initialization', () => {
        it('should initialize successfully', async () => {
            const newManager = PhotoMarkupManager.getInstance();
            await expect(newManager.initialize()).resolves.not.toThrow();
        });

        it('should not reinitialize if already initialized', async () => {
            // Manager is already initialized in beforeEach
            await expect(manager.initialize()).resolves.not.toThrow();
        });

        it('should emit initialized event', async () => {
            // Create a fresh manager instance by resetting the singleton
            (PhotoMarkupManager as any).instance = undefined;
            const newManager = PhotoMarkupManager.getInstance();
            
            const initPromise = new Promise((resolve) => {
                newManager.once('initialized', resolve);
            });
            
            await newManager.initialize();
            await expect(initPromise).resolves.toBeUndefined();
        });
    });

    describe('Photo Capture', () => {
        it('should capture photo with default options', async () => {
            const photo = await manager.capturePhoto();
            
            expect(photo).toBeDefined();
            expect(photo.id).toBeDefined();
            expect(photo.uri).toBeDefined();
            expect(photo.location).toBeDefined();
            expect(photo.timestamp).toBeGreaterThan(0);
        });

        it('should capture photo with custom options', async () => {
            const options = {
                quality: 0.5,
                maxWidth: 1024,
                includeLocation: false
            };
            
            const photo = await manager.capturePhoto(options);
            
            expect(photo).toBeDefined();
            expect(photo.location).toBeUndefined();
        });

        it('should update state after photo capture', async () => {
            await manager.capturePhoto();
            
            const state = manager.getState();
            expect(state.currentPhoto).toBeDefined();
            expect(state.annotations).toHaveLength(0);
        });

        it('should emit photo captured event', async () => {
            const eventPromise = new Promise((resolve) => {
                manager.once('photo_captured', resolve);
            });
            
            await manager.capturePhoto();
            await expect(eventPromise).resolves.toBeDefined();
        });
    });

    describe('Annotation Management', () => {
        beforeEach(async () => {
            // Load a mock photo first
            (manager as any).state.currentPhoto = mockPhoto;
        });

        it('should add annotation successfully', () => {
            manager.addAnnotation(mockAnnotation);
            
            const state = manager.getState();
            expect(state.annotations).toHaveLength(1);
            expect(state.annotations[0]).toEqual(mockAnnotation);
        });

        it('should update annotation successfully', () => {
            manager.addAnnotation(mockAnnotation);
            
            const updates = { 
                style: { ...mockAnnotation.style, strokeColor: '#00FF00' }
            };
            
            const success = manager.updateAnnotation(mockAnnotation.id, updates);
            
            expect(success).toBe(true);
            
            const state = manager.getState();
            expect(state.annotations[0].style.strokeColor).toBe('#00FF00');
        });

        it('should remove annotation successfully', () => {
            manager.addAnnotation(mockAnnotation);
            
            const success = manager.removeAnnotation(mockAnnotation.id);
            
            expect(success).toBe(true);
            
            const state = manager.getState();
            expect(state.annotations).toHaveLength(0);
        });

        it('should clear all annotations', () => {
            manager.addAnnotation(mockAnnotation);
            manager.addAnnotation({ ...mockAnnotation, id: 'test-annotation-2' });
            
            manager.clearAnnotations();
            
            const state = manager.getState();
            expect(state.annotations).toHaveLength(0);
        });

        it('should throw error when adding annotation without photo', () => {
            (manager as any).state.currentPhoto = undefined;
            
            expect(() => {
                manager.addAnnotation(mockAnnotation);
            }).toThrow(PhotoMarkupError);
        });

        it('should emit annotation events', () => {
            const addedPromise = new Promise((resolve) => {
                manager.once('annotation_added', resolve);
            });
            
            manager.addAnnotation(mockAnnotation);
            
            return expect(addedPromise).resolves.toEqual(mockAnnotation);
        });
    });

    describe('Undo/Redo Functionality', () => {
        beforeEach(() => {
            (manager as any).state.currentPhoto = mockPhoto;
        });

        it('should support undo operation', () => {
            // Add annotation
            manager.addAnnotation(mockAnnotation);
            expect(manager.getState().annotations).toHaveLength(1);
            
            // Undo
            const success = manager.undo();
            expect(success).toBe(true);
            expect(manager.getState().annotations).toHaveLength(0);
        });

        it('should support redo operation', () => {
            // Add annotation and undo
            manager.addAnnotation(mockAnnotation);
            manager.undo();
            
            // Redo
            const success = manager.redo();
            expect(success).toBe(true);
            expect(manager.getState().annotations).toHaveLength(1);
        });

        it('should return false when no undo available', () => {
            const success = manager.undo();
            expect(success).toBe(false);
        });

        it('should return false when no redo available', () => {
            const success = manager.redo();
            expect(success).toBe(false);
        });

        it('should clear redo history when new action is performed', () => {
            // Add, undo, add new
            manager.addAnnotation(mockAnnotation);
            manager.undo();
            manager.addAnnotation({ ...mockAnnotation, id: 'new-annotation' });
            
            // Should not be able to redo original
            const success = manager.redo();
            expect(success).toBe(false);
        });
    });

    describe('Tool Management', () => {
        it('should set current tool', () => {
            const tools = manager.getAvailableTools();
            const arrowTool = tools.find(t => t.type === 'arrow')!;
            
            manager.setTool(arrowTool);
            
            const state = manager.getState();
            expect(state.selectedTool).toEqual(arrowTool);
        });

        it('should emit tool selected event', () => {
            const tools = manager.getAvailableTools();
            const textTool = tools.find(t => t.type === 'text')!;
            
            const eventPromise = new Promise((resolve) => {
                manager.once('tool_selected', resolve);
            });
            
            manager.setTool(textTool);
            
            return expect(eventPromise).resolves.toEqual(textTool);
        });

        it('should return available tools', () => {
            const tools = manager.getAvailableTools();
            
            expect(tools).toHaveLength(MarkupCanvas.DEFAULT_TOOLS.length);
            expect(tools.map(t => t.type)).toContain('circle');
            expect(tools.map(t => t.type)).toContain('arrow');
            expect(tools.map(t => t.type)).toContain('text');
        });
    });

    describe('Photo Storage', () => {
        beforeEach(() => {
            (manager as any).state.currentPhoto = mockPhoto;
            manager.addAnnotation(mockAnnotation);
        });

        it('should save photo successfully', async () => {
            const photoPath = await manager.savePhoto('test-author');
            
            expect(photoPath).toBeDefined();
            expect(typeof photoPath).toBe('string');
        });

        it('should throw error when saving without photo', async () => {
            (manager as any).state.currentPhoto = undefined;
            
            await expect(manager.savePhoto()).rejects.toThrow(PhotoMarkupError);
        });

        it('should load saved photo', async () => {
            await manager.savePhoto();
            const photoId = 'test-photo-id';
            
            // Mock the storage service to return our photo
            const mockMarkedUpPhoto: MarkedUpPhoto = {
                id: photoId,
                photo: mockPhoto,
                annotations: [mockAnnotation],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                author: 'test-author',
                shared: false,
                syncStatus: 'pending'
            };
            
            vi.spyOn(manager['storageService'], 'retrievePhoto')
                .mockResolvedValue(mockMarkedUpPhoto);
            
            const loadedPhoto = await manager.loadPhoto(photoId);
            
            expect(loadedPhoto).toEqual(mockMarkedUpPhoto);
        });
    });

    describe('Photo Sharing', () => {
        let mockMarkedUpPhoto: MarkedUpPhoto;

        beforeEach(() => {
            mockMarkedUpPhoto = {
                id: 'share-test-photo',
                photo: mockPhoto,
                annotations: [mockAnnotation],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                author: 'test-author',
                shared: false,
                syncStatus: 'pending'
            };
        });

        it('should share photo successfully', async () => {
            // Mock storage and TAK integration
            vi.spyOn(manager['storageService'], 'retrievePhoto')
                .mockResolvedValue(mockMarkedUpPhoto);
            vi.spyOn(manager['takIntegration'], 'sharePhoto')
                .mockResolvedValue(true);
            vi.spyOn(manager['storageService'], 'markPhotoSynced')
                .mockResolvedValue();

            const shareOptions = {
                recipients: ['user1', 'user2'],
                includeLocation: true,
                compressionQuality: 0.8,
                priority: 'normal' as const
            };

            const success = await manager.sharePhoto(mockMarkedUpPhoto.id, shareOptions);
            
            expect(success).toBe(true);
        });

        it('should emit photo shared event', async () => {
            vi.spyOn(manager['storageService'], 'retrievePhoto')
                .mockResolvedValue(mockMarkedUpPhoto);
            vi.spyOn(manager['takIntegration'], 'sharePhoto')
                .mockResolvedValue(true);
            vi.spyOn(manager['storageService'], 'markPhotoSynced')
                .mockResolvedValue();

            const eventPromise = new Promise((resolve) => {
                manager.once('photo_shared', resolve);
            });

            await manager.sharePhoto(mockMarkedUpPhoto.id, {
                includeLocation: true,
                compressionQuality: 0.8,
                priority: 'normal'
            });

            await expect(eventPromise).resolves.toBeDefined();
        });

        it('should handle sharing failure', async () => {
            vi.spyOn(manager['storageService'], 'retrievePhoto')
                .mockResolvedValue(mockMarkedUpPhoto);
            vi.spyOn(manager['takIntegration'], 'sharePhoto')
                .mockRejectedValue(new Error('Network error'));
            vi.spyOn(manager['storageService'], 'updatePhoto')
                .mockResolvedValue();

            await expect(
                manager.sharePhoto(mockMarkedUpPhoto.id, {
                    includeLocation: true,
                    compressionQuality: 0.8,
                    priority: 'normal'
                })
            ).rejects.toThrow();
        });
    });

    describe('Network Integration', () => {
        it('should process incoming photo', async () => {
            const mockCoTXml = `<?xml version="1.0" encoding="UTF-8"?>
                <event version="2.0" uid="incoming-photo" type="b-i-x-i" how="m-g">
                    <point lat="37.7749" lon="-122.4194" hae="10"/>
                    <detail>
                        <image url="/path/to/image.jpg" name="incoming.jpg" size="1024"/>
                    </detail>
                </event>`;

            vi.spyOn(manager['takIntegration'], 'processIncomingPhoto')
                .mockResolvedValue({
                    id: 'incoming-photo',
                    photo: mockPhoto,
                    annotations: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    author: 'remote-user',
                    shared: true,
                    syncStatus: 'synced'
                });

            const result = await manager.processIncomingPhoto(mockCoTXml);
            
            expect(result).toBeDefined();
            expect(result?.author).toBe('remote-user');
        });

        it('should get connection status', () => {
            const status = manager.getConnectionStatus();
            
            expect(status).toHaveProperty('takServer');
            expect(status).toHaveProperty('meshNetwork');
            expect(status).toHaveProperty('queuedItems');
        });
    });

    describe('Statistics and Monitoring', () => {
        it('should get storage statistics', async () => {
            const stats = await manager.getStorageStats();
            
            expect(stats).toHaveProperty('totalPhotos');
            expect(stats).toHaveProperty('totalSize');
            expect(stats).toHaveProperty('syncPending');
            expect(stats).toHaveProperty('storageUsed');
            expect(stats).toHaveProperty('storageAvailable');
        });

        it('should get pending sync photos', async () => {
            const pendingPhotos = await manager.getPendingSyncPhotos();
            
            expect(Array.isArray(pendingPhotos)).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should throw error when not initialized', () => {
            const newManager = PhotoMarkupManager.getInstance();
            // Reset initialization state to test error condition
            (newManager as any).isInitialized = false;
            
            expect(() => {
                newManager.getState();
            }).toThrow(PhotoMarkupError);
            
            // Restore initialization state for other tests
            (newManager as any).isInitialized = true;
        });

        it('should handle photo capture errors gracefully', async () => {
            vi.spyOn(manager['captureService'], 'capturePhoto')
                .mockRejectedValue(new Error('Camera not available'));

            await expect(manager.capturePhoto()).rejects.toThrow();
        });

        it('should handle storage errors gracefully', async () => {
            (manager as any).state.currentPhoto = mockPhoto;
            
            vi.spyOn(manager['storageService'], 'storePhoto')
                .mockRejectedValue(new Error('Storage full'));

            await expect(manager.savePhoto()).rejects.toThrow();
        });
    });

    describe('Cleanup', () => {
        it('should cleanup resources properly', async () => {
            await expect(manager.cleanup()).resolves.not.toThrow();
        });

        it('should stop auto-sync on cleanup', async () => {
            const managerWithAutoSync = PhotoMarkupManager.getInstance();
            await managerWithAutoSync.initialize({ autoSync: true });
            
            await expect(managerWithAutoSync.cleanup()).resolves.not.toThrow();
        });
    });
});
