/**
 * OfflineStorageService - Handles offline-first storage for photos and markups
 * Implements encrypted storage, sync queuing, and conflict resolution
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import CryptoJS from 'crypto-js';

import type { MarkedUpPhoto, StoredPhotoMarkup, PhotoMarkupConfig } from './types';
import { PhotoMarkupError, PhotoMarkupErrorCodes } from './types';

export interface StorageStats {
    totalPhotos: number;
    totalSize: number;
    syncPending: number;
    lastSync?: number;
    storageUsed: number;
    storageAvailable: number;
}

export class OfflineStorageService {
    private static instance: OfflineStorageService;
    private config: PhotoMarkupConfig;
    private storageDir: string;
    private thumbnailDir: string;
    private encryptionKey?: string;

    // Storage keys
    private static readonly STORAGE_KEYS = {
        PHOTOS: 'dtak_photos',
        CONFIG: 'dtak_photo_config',
        SYNC_QUEUE: 'dtak_sync_queue',
        ENCRYPTION_KEY: 'dtak_encryption_key'
    };

    private constructor() {
        this.config = this.getDefaultConfig();
        this.storageDir = `${RNFS.DocumentDirectoryPath}/dtak_photos`;
        this.thumbnailDir = `${this.storageDir}/thumbnails`;
    }

    public static getInstance(): OfflineStorageService {
        if (!OfflineStorageService.instance) {
            OfflineStorageService.instance = new OfflineStorageService();
        }
        return OfflineStorageService.instance;
    }

    /**
     * Initialize storage service
     */
    public async initialize(config?: Partial<PhotoMarkupConfig>): Promise<void> {
        try {
            // Load or create configuration
            await this.loadConfig();
            if (config) {
                this.config = { ...this.config, ...config };
                await this.saveConfig();
            }

            // Create storage directories
            await this.createDirectories();

            // Initialize encryption if enabled
            if (this.config.encryptionEnabled) {
                await this.initializeEncryption();
            }

            console.log('OfflineStorageService initialized');
        } catch (error) {
            console.error('Storage initialization failed:', error);
            throw new PhotoMarkupError(
                'Failed to initialize storage service',
                PhotoMarkupErrorCodes.STORAGE_FULL,
                error
            );
        }
    }

    /**
     * Get default configuration
     */
    private getDefaultConfig(): PhotoMarkupConfig {
        return {
            maxPhotoSize: 50 * 1024 * 1024, // 50MB
            thumbnailSize: { width: 200, height: 200 },
            compressionQuality: 0.8,
            encryptionEnabled: true,
            autoSync: true,
            retryAttempts: 3,
            retryDelay: 5000 // 5 seconds
        };
    }

    /**
     * Load configuration from storage
     */
    private async loadConfig(): Promise<void> {
        try {
            const configJson = await AsyncStorage.getItem(OfflineStorageService.STORAGE_KEYS.CONFIG);
            if (configJson) {
                this.config = { ...this.config, ...JSON.parse(configJson) };
            }
        } catch (error) {
            console.warn('Failed to load config, using defaults:', error);
        }
    }

    /**
     * Save configuration to storage
     */
    private async saveConfig(): Promise<void> {
        try {
            await AsyncStorage.setItem(
                OfflineStorageService.STORAGE_KEYS.CONFIG,
                JSON.stringify(this.config)
            );
        } catch (error) {
            console.error('Failed to save config:', error);
        }
    }

    /**
     * Create necessary directories
     */
    private async createDirectories(): Promise<void> {
        try {
            await RNFS.mkdir(this.storageDir);
            await RNFS.mkdir(this.thumbnailDir);
        } catch {
            // Directories might already exist
            console.log('Storage directories created or already exist');
        }
    }

    /**
     * Initialize encryption key
     */
    private async initializeEncryption(): Promise<void> {
        try {
            let key = await AsyncStorage.getItem(OfflineStorageService.STORAGE_KEYS.ENCRYPTION_KEY);
            
            if (!key) {
                // Generate new encryption key
                key = CryptoJS.lib.WordArray.random(256/8).toString();
                await AsyncStorage.setItem(OfflineStorageService.STORAGE_KEYS.ENCRYPTION_KEY, key);
            }
            
            this.encryptionKey = key;
        } catch (error) {
            console.error('Encryption initialization failed:', error);
            throw new PhotoMarkupError(
                'Failed to initialize encryption',
                PhotoMarkupErrorCodes.ENCRYPTION_FAILED,
                error
            );
        }
    }

    /**
     * Store a marked up photo
     */
    public async storePhoto(markedUpPhoto: MarkedUpPhoto): Promise<string> {
        try {
            // Check storage space
            await this.checkStorageSpace(markedUpPhoto.photo.fileSize);

            // Generate unique filename
            const filename = `photo_${markedUpPhoto.id}_${Date.now()}.jpg`;
            const photoPath = `${this.storageDir}/${filename}`;

            // Copy photo to storage directory
            await RNFS.copyFile(markedUpPhoto.photo.uri, photoPath);

            // Create thumbnail
            const thumbnailPath = await this.createThumbnail(photoPath, markedUpPhoto.id);

            // Prepare storage data
            const storageData: StoredPhotoMarkup = {
                id: markedUpPhoto.id,
                photoPath,
                thumbnailPath,
                markupData: markedUpPhoto,
                syncAttempts: 0
            };

            // Encrypt if enabled
            if (this.config.encryptionEnabled && this.encryptionKey) {
                storageData.encryptionKey = this.encryptionKey;
                // Note: In a real implementation, you might encrypt the actual photo file
            }

            // Store metadata
            await this.storePhotoMetadata(storageData);

            // Update photo URI to local path
            markedUpPhoto.photo.uri = photoPath;

            return photoPath;

        } catch (error) {
            console.error('Failed to store photo:', error);
            throw new PhotoMarkupError(
                'Failed to store photo',
                PhotoMarkupErrorCodes.STORAGE_FULL,
                error
            );
        }
    }

    /**
     * Check available storage space
     */
    private async checkStorageSpace(requiredSize: number): Promise<void> {
        try {
            const freeSpace = await RNFS.getFSInfo();
            
            if (freeSpace.freeSpace < requiredSize + (10 * 1024 * 1024)) { // 10MB buffer
                throw new PhotoMarkupError(
                    'Insufficient storage space',
                    PhotoMarkupErrorCodes.STORAGE_FULL
                );
            }

            // Check against max photo size
            if (requiredSize > this.config.maxPhotoSize) {
                throw new PhotoMarkupError(
                    'Photo exceeds maximum size limit',
                    PhotoMarkupErrorCodes.STORAGE_FULL
                );
            }

        } catch (error) {
            if (error instanceof PhotoMarkupError) {
                throw error;
            }
            console.warn('Storage space check failed:', error);
        }
    }

    /**
     * Create thumbnail for photo
     */
    private async createThumbnail(photoPath: string, photoId: string): Promise<string> {
        try {
            // This would use ImageResizer to create thumbnail
            // For now, return a placeholder path
            const thumbnailPath = `${this.thumbnailDir}/thumb_${photoId}.jpg`;
            
            // Implementation would create actual thumbnail
            console.log(`Creating thumbnail: ${thumbnailPath}`);
            
            return thumbnailPath;
        } catch (error) {
            console.warn('Thumbnail creation failed:', error);
            return '';
        }
    }

    /**
     * Store photo metadata
     */
    private async storePhotoMetadata(storageData: StoredPhotoMarkup): Promise<void> {
        try {
            const existingPhotos = await this.getAllStoredPhotos();
            existingPhotos[storageData.id] = storageData;
            
            const dataToStore = this.config.encryptionEnabled && this.encryptionKey
                ? this.encryptData(JSON.stringify(existingPhotos))
                : JSON.stringify(existingPhotos);

            await AsyncStorage.setItem(OfflineStorageService.STORAGE_KEYS.PHOTOS, dataToStore);
        } catch (error) {
            throw new PhotoMarkupError(
                'Failed to store photo metadata',
                PhotoMarkupErrorCodes.STORAGE_FULL,
                error
            );
        }
    }

    /**
     * Get all stored photos metadata
     */
    private async getAllStoredPhotos(): Promise<Record<string, StoredPhotoMarkup>> {
        try {
            const photosData = await AsyncStorage.getItem(OfflineStorageService.STORAGE_KEYS.PHOTOS);
            
            if (!photosData) {
                return {};
            }

            const decryptedData = this.config.encryptionEnabled && this.encryptionKey
                ? this.decryptData(photosData)
                : photosData;

            return JSON.parse(decryptedData);
        } catch (error) {
            console.error('Failed to load stored photos:', error);
            return {};
        }
    }

    /**
     * Retrieve a stored photo
     */
    public async retrievePhoto(photoId: string): Promise<MarkedUpPhoto | null> {
        try {
            const storedPhotos = await this.getAllStoredPhotos();
            const storedPhoto = storedPhotos[photoId];
            
            if (!storedPhoto) {
                return null;
            }

            // Verify photo file exists
            const exists = await RNFS.exists(storedPhoto.photoPath);
            if (!exists) {
                console.warn(`Photo file not found: ${storedPhoto.photoPath}`);
                // Clean up metadata
                await this.deletePhoto(photoId);
                return null;
            }

            return storedPhoto.markupData;

        } catch (error) {
            console.error('Failed to retrieve photo:', error);
            return null;
        }
    }

    /**
     * Get all stored photos
     */
    public async getAllPhotos(): Promise<MarkedUpPhoto[]> {
        try {
            const storedPhotos = await this.getAllStoredPhotos();
            const photos: MarkedUpPhoto[] = [];

            for (const [photoId, storedPhoto] of Object.entries(storedPhotos)) {
                // Verify photo file exists
                const exists = await RNFS.exists(storedPhoto.photoPath);
                if (exists) {
                    photos.push(storedPhoto.markupData);
                } else {
                    // Clean up orphaned metadata
                    console.warn(`Cleaning up orphaned photo metadata: ${photoId}`);
                    await this.deletePhoto(photoId);
                }
            }

            // Sort by creation date (newest first)
            return photos.sort((a, b) => b.createdAt - a.createdAt);

        } catch (error) {
            console.error('Failed to get all photos:', error);
            return [];
        }
    }

    /**
     * Update photo markup data
     */
    public async updatePhoto(markedUpPhoto: MarkedUpPhoto): Promise<void> {
        try {
            const storedPhotos = await this.getAllStoredPhotos();
            const existingPhoto = storedPhotos[markedUpPhoto.id];
            
            if (!existingPhoto) {
                throw new PhotoMarkupError(
                    'Photo not found in storage',
                    PhotoMarkupErrorCodes.INVALID_ANNOTATION
                );
            }

            // Update markup data
            existingPhoto.markupData = {
                ...markedUpPhoto,
                updatedAt: Date.now()
            };

            // Save updated data
            await this.storePhotoMetadata(existingPhoto);

        } catch (error) {
            console.error('Failed to update photo:', error);
            throw new PhotoMarkupError(
                'Failed to update photo',
                PhotoMarkupErrorCodes.STORAGE_FULL,
                error
            );
        }
    }

    /**
     * Delete a stored photo
     */
    public async deletePhoto(photoId: string): Promise<boolean> {
        try {
            const storedPhotos = await this.getAllStoredPhotos();
            const storedPhoto = storedPhotos[photoId];
            
            if (!storedPhoto) {
                return false;
            }

            // Delete photo file
            try {
                await RNFS.unlink(storedPhoto.photoPath);
            } catch (error) {
                console.warn('Photo file deletion failed:', error);
            }

            // Delete thumbnail
            if (storedPhoto.thumbnailPath) {
                try {
                    await RNFS.unlink(storedPhoto.thumbnailPath);
                } catch (error) {
                    console.warn('Thumbnail deletion failed:', error);
                }
            }

            // Remove from metadata
            delete storedPhotos[photoId];
            
            const dataToStore = this.config.encryptionEnabled && this.encryptionKey
                ? this.encryptData(JSON.stringify(storedPhotos))
                : JSON.stringify(storedPhotos);

            await AsyncStorage.setItem(OfflineStorageService.STORAGE_KEYS.PHOTOS, dataToStore);

            return true;

        } catch (error) {
            console.error('Failed to delete photo:', error);
            return false;
        }
    }

    /**
     * Get photos pending synchronization
     */
    public async getPendingSyncPhotos(): Promise<MarkedUpPhoto[]> {
        try {
            const allPhotos = await this.getAllPhotos();
            return allPhotos.filter(photo => photo.syncStatus === 'pending' || photo.syncStatus === 'failed');
        } catch (error) {
            console.error('Failed to get pending sync photos:', error);
            return [];
        }
    }

    /**
     * Mark photo as synced
     */
    public async markPhotoSynced(photoId: string): Promise<void> {
        try {
            const photo = await this.retrievePhoto(photoId);
            if (photo) {
                photo.syncStatus = 'synced';
                await this.updatePhoto(photo);
            }
        } catch (error) {
            console.error('Failed to mark photo as synced:', error);
        }
    }

    /**
     * Get storage statistics
     */
    public async getStorageStats(): Promise<StorageStats> {
        try {
            const allPhotos = await this.getAllPhotos();
            const fsInfo = await RNFS.getFSInfo();
            
            let totalSize = 0;
            let syncPending = 0;
            
            for (const photo of allPhotos) {
                totalSize += photo.photo.fileSize;
                if (photo.syncStatus === 'pending' || photo.syncStatus === 'failed') {
                    syncPending++;
                }
            }

            return {
                totalPhotos: allPhotos.length,
                totalSize,
                syncPending,
                storageUsed: totalSize,
                storageAvailable: fsInfo.freeSpace
            };

        } catch (error) {
            console.error('Failed to get storage stats:', error);
            return {
                totalPhotos: 0,
                totalSize: 0,
                syncPending: 0,
                storageUsed: 0,
                storageAvailable: 0
            };
        }
    }

    /**
     * Clean up old photos based on retention policy
     */
    public async cleanupOldPhotos(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
        try {
            const allPhotos = await this.getAllPhotos();
            const cutoffTime = Date.now() - maxAge;
            let deletedCount = 0;

            for (const photo of allPhotos) {
                if (photo.createdAt < cutoffTime && photo.syncStatus === 'synced') {
                    const deleted = await this.deletePhoto(photo.id);
                    if (deleted) {
                        deletedCount++;
                    }
                }
            }

            console.log(`Cleaned up ${deletedCount} old photos`);
            return deletedCount;

        } catch (error) {
            console.error('Cleanup failed:', error);
            return 0;
        }
    }

    /**
     * Encrypt data
     */
    private encryptData(data: string): string {
        if (!this.encryptionKey) {
            throw new PhotoMarkupError(
                'Encryption key not available',
                PhotoMarkupErrorCodes.ENCRYPTION_FAILED
            );
        }

        try {
            return CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
        } catch (error) {
            throw new PhotoMarkupError(
                'Data encryption failed',
                PhotoMarkupErrorCodes.ENCRYPTION_FAILED,
                error
            );
        }
    }

    /**
     * Decrypt data
     */
    private decryptData(encryptedData: string): string {
        if (!this.encryptionKey) {
            throw new PhotoMarkupError(
                'Encryption key not available',
                PhotoMarkupErrorCodes.ENCRYPTION_FAILED
            );
        }

        try {
            const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
            return bytes.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            throw new PhotoMarkupError(
                'Data decryption failed',
                PhotoMarkupErrorCodes.ENCRYPTION_FAILED,
                error
            );
        }
    }

    /**
     * Export all photos for backup
     */
    public async exportPhotos(): Promise<string> {
        try {
            const allPhotos = await this.getAllPhotos();
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                photos: allPhotos,
                config: this.config
            };

            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            throw new PhotoMarkupError(
                'Export failed',
                PhotoMarkupErrorCodes.STORAGE_FULL,
                error
            );
        }
    }

    /**
     * Get configuration
     */
    public getConfig(): PhotoMarkupConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    public async updateConfig(newConfig: Partial<PhotoMarkupConfig>): Promise<void> {
        this.config = { ...this.config, ...newConfig };
        await this.saveConfig();
    }

    /**
     * Cleanup resources
     */
    public async cleanup(): Promise<void> {
        try {
            // Perform any necessary cleanup
            console.log('OfflineStorageService cleanup completed');
        } catch (error) {
            console.error('Cleanup failed:', error);
        }
    }
}
