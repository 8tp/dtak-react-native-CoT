/**
 * PhotoMarkupManager - Main coordinator for the dTAK photo markup feature
 * Orchestrates photo capture, markup, storage, and sharing functionality
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

import { PhotoCaptureService } from './PhotoCaptureService';
import { MarkupCanvas } from './MarkupCanvas';
import { TakPhotoIntegration } from './TakPhotoIntegration';
import { OfflineStorageService } from './OfflineStorageService';

import type {
    MarkedUpPhoto,
    PhotoMetadata,
    MarkupAnnotation,
    MarkupTool,
    PhotoCaptureOptions,
    ShareOptions,
    PhotoMarkupState,
    PhotoMarkupEvent,
    PhotoMarkupConfig
} from './types';
import { PhotoMarkupError, PhotoMarkupErrorCodes } from './types';

export interface PhotoMarkupManagerConfig {
    storage?: Partial<PhotoMarkupConfig>;
    autoSave?: boolean;
    autoSync?: boolean;
    syncInterval?: number; // milliseconds
}

export class PhotoMarkupManager extends EventEmitter {
    private static instance: PhotoMarkupManager;
    
    private captureService: PhotoCaptureService;
    private storageService: OfflineStorageService;
    private takIntegration: TakPhotoIntegration;
    
    private state: PhotoMarkupState;
    private config: PhotoMarkupManagerConfig;
    private syncTimer?: ReturnType<typeof setInterval>;
    private isInitialized = false;

    private constructor() {
        super();
        
        this.captureService = PhotoCaptureService.getInstance();
        this.storageService = OfflineStorageService.getInstance();
        this.takIntegration = TakPhotoIntegration.getInstance();
        
        this.state = {
            annotations: [],
            selectedTool: MarkupCanvas.DEFAULT_TOOLS[0],
            isDrawing: false,
            history: [],
            historyIndex: -1
        };
        
        this.config = {
            autoSave: true,
            autoSync: true,
            syncInterval: 30000 // 30 seconds
        };
    }

    public static getInstance(): PhotoMarkupManager {
        if (!PhotoMarkupManager.instance) {
            PhotoMarkupManager.instance = new PhotoMarkupManager();
        }
        return PhotoMarkupManager.instance;
    }

    /**
     * Initialize the photo markup manager
     */
    public async initialize(config?: PhotoMarkupManagerConfig): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            // Update configuration
            if (config) {
                this.config = { ...this.config, ...config };
            }

            // Initialize services
            await this.storageService.initialize(config?.storage);
            await this.captureService.requestPermissions();

            // Setup auto-sync if enabled
            if (this.config.autoSync) {
                this.startAutoSync();
            }

            // Initialize history with empty state
            this.saveToHistory();

            this.isInitialized = true;
            this.emit('initialized');
            
            console.log('PhotoMarkupManager initialized successfully');

        } catch (error) {
            console.error('PhotoMarkupManager initialization failed:', error);
            throw new PhotoMarkupError(
                'Failed to initialize photo markup manager',
                PhotoMarkupErrorCodes.PHOTO_CAPTURE_FAILED,
                error
            );
        }
    }

    /**
     * Capture a new photo with geo-tagging
     */
    public async capturePhoto(options?: Partial<PhotoCaptureOptions>): Promise<PhotoMetadata> {
        this.ensureInitialized();

        try {
            const captureOptions: PhotoCaptureOptions = {
                quality: 0.8,
                maxWidth: 2048,
                maxHeight: 2048,
                includeLocation: true,
                includeExif: true,
                ...options
            };

            const photoMetadata = await this.captureService.capturePhoto(captureOptions);
            
            // Update state
            this.state.currentPhoto = photoMetadata;
            this.state.annotations = [];
            this.clearHistory();

            // Emit event
            this.emitEvent({ type: 'PHOTO_CAPTURED', payload: photoMetadata });

            return photoMetadata;

        } catch (error) {
            console.error('Photo capture failed:', error);
            throw error;
        }
    }

    /**
     * Load an existing photo for markup
     */
    public async loadPhoto(photoId: string): Promise<MarkedUpPhoto | null> {
        this.ensureInitialized();

        try {
            const markedUpPhoto = await this.storageService.retrievePhoto(photoId);
            
            if (markedUpPhoto) {
                this.state.currentPhoto = markedUpPhoto.photo;
                this.state.annotations = [...markedUpPhoto.annotations];
                this.clearHistory();
                this.saveToHistory();
            }

            return markedUpPhoto;

        } catch (error) {
            console.error('Failed to load photo:', error);
            return null;
        }
    }

    /**
     * Add annotation to current photo
     */
    public addAnnotation(annotation: MarkupAnnotation): void {
        this.ensureInitialized();

        if (!this.state.currentPhoto) {
            throw new PhotoMarkupError(
                'No photo loaded for annotation',
                PhotoMarkupErrorCodes.INVALID_ANNOTATION
            );
        }

        // Add to state
        this.state.annotations.push(annotation);
        
        // Save to history for undo/redo
        this.saveToHistory();

        // Auto-save if enabled
        if (this.config.autoSave) {
            this.autoSaveCurrentPhoto();
        }

        // Emit event
        this.emitEvent({ type: 'ANNOTATION_ADDED', payload: annotation });
    }

    /**
     * Update existing annotation
     */
    public updateAnnotation(annotationId: string, updates: Partial<MarkupAnnotation>): boolean {
        this.ensureInitialized();

        const index = this.state.annotations.findIndex(a => a.id === annotationId);
        if (index === -1) {
            return false;
        }

        // Update annotation
        this.state.annotations[index] = {
            ...this.state.annotations[index],
            ...updates,
            timestamp: Date.now()
        };

        // Save to history
        this.saveToHistory();

        // Auto-save if enabled
        if (this.config.autoSave) {
            this.autoSaveCurrentPhoto();
        }

        // Emit event
        this.emitEvent({ 
            type: 'ANNOTATION_UPDATED', 
            payload: this.state.annotations[index] 
        });

        return true;
    }

    /**
     * Remove annotation
     */
    public removeAnnotation(annotationId: string): boolean {
        this.ensureInitialized();

        const index = this.state.annotations.findIndex(a => a.id === annotationId);
        if (index === -1) {
            return false;
        }

        // Remove annotation
        this.state.annotations.splice(index, 1);

        // Save to history
        this.saveToHistory();

        // Auto-save if enabled
        if (this.config.autoSave) {
            this.autoSaveCurrentPhoto();
        }

        // Emit event
        this.emitEvent({ type: 'ANNOTATION_DELETED', payload: annotationId });

        return true;
    }

    /**
     * Clear all annotations
     */
    public clearAnnotations(): void {
        this.ensureInitialized();

        this.state.annotations = [];
        this.saveToHistory();

        // Auto-save if enabled
        if (this.config.autoSave) {
            this.autoSaveCurrentPhoto();
        }

        // Emit event
        this.emitEvent({ type: 'CLEAR_ANNOTATIONS' });
    }

    /**
     * Set current markup tool
     */
    public setTool(tool: MarkupTool): void {
        this.state.selectedTool = tool;
        this.emitEvent({ type: 'TOOL_SELECTED', payload: tool });
    }

    /**
     * Undo last action
     */
    public undo(): boolean {
        if (this.state.historyIndex > 0) {
            this.state.historyIndex--;
            this.state.annotations = [...this.state.history[this.state.historyIndex]];
            
            // Auto-save if enabled
            if (this.config.autoSave) {
                this.autoSaveCurrentPhoto();
            }

            this.emitEvent({ type: 'UNDO_REQUESTED' });
            return true;
        }
        return false;
    }

    /**
     * Redo last undone action
     */
    public redo(): boolean {
        if (this.state.historyIndex < this.state.history.length - 1) {
            this.state.historyIndex++;
            this.state.annotations = [...this.state.history[this.state.historyIndex]];
            
            // Auto-save if enabled
            if (this.config.autoSave) {
                this.autoSaveCurrentPhoto();
            }

            this.emitEvent({ type: 'REDO_REQUESTED' });
            return true;
        }
        return false;
    }

    /**
     * Save current photo with markups
     */
    public async savePhoto(author: string = 'current-user'): Promise<string> {
        this.ensureInitialized();

        if (!this.state.currentPhoto) {
            throw new PhotoMarkupError(
                'No photo to save',
                PhotoMarkupErrorCodes.INVALID_ANNOTATION
            );
        }

        try {
            const markedUpPhoto: MarkedUpPhoto = {
                id: uuidv4(),
                photo: this.state.currentPhoto,
                annotations: [...this.state.annotations],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                author,
                shared: false,
                syncStatus: 'pending'
            };

            const photoPath = await this.storageService.storePhoto(markedUpPhoto);
            
            // Auto-sync if enabled
            if (this.config.autoSync) {
                this.scheduleSync(markedUpPhoto);
            }

            return photoPath;

        } catch (error) {
            console.error('Failed to save photo:', error);
            throw error;
        }
    }

    /**
     * Share photo with team members
     */
    public async sharePhoto(
        photoId: string, 
        options: ShareOptions,
        author: string = 'current-user'
    ): Promise<boolean> {
        this.ensureInitialized();

        try {
            let markedUpPhoto = await this.storageService.retrievePhoto(photoId);
            
            // If not found in storage, create from current state
            if (!markedUpPhoto && this.state.currentPhoto) {
                markedUpPhoto = {
                    id: photoId,
                    photo: this.state.currentPhoto,
                    annotations: [...this.state.annotations],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    author,
                    shared: false,
                    syncStatus: 'pending'
                };
                
                // Save first
                await this.storageService.storePhoto(markedUpPhoto);
            }

            if (!markedUpPhoto) {
                throw new PhotoMarkupError(
                    'Photo not found for sharing',
                    PhotoMarkupErrorCodes.INVALID_ANNOTATION
                );
            }

            // Share via TAK integration
            const success = await this.takIntegration.sharePhoto(markedUpPhoto, options);
            
            if (success) {
                // Update storage
                await this.storageService.markPhotoSynced(photoId);
                
                // Emit event
                this.emitEvent({ 
                    type: 'PHOTO_SHARED', 
                    payload: { photoId, recipients: options.recipients || [] }
                });
            }

            return success;

        } catch (error) {
            console.error('Photo sharing failed:', error);
            
            // Update sync status
            const photo = await this.storageService.retrievePhoto(photoId);
            if (photo) {
                photo.syncStatus = 'failed';
                await this.storageService.updatePhoto(photo);
            }

            throw error;
        }
    }

    /**
     * Get all stored photos
     */
    public async getAllPhotos(): Promise<MarkedUpPhoto[]> {
        this.ensureInitialized();
        return await this.storageService.getAllPhotos();
    }

    /**
     * Get photos pending synchronization
     */
    public async getPendingSyncPhotos(): Promise<MarkedUpPhoto[]> {
        this.ensureInitialized();
        return await this.storageService.getPendingSyncPhotos();
    }

    /**
     * Delete a photo
     */
    public async deletePhoto(photoId: string): Promise<boolean> {
        this.ensureInitialized();
        return await this.storageService.deletePhoto(photoId);
    }

    /**
     * Get current state
     */
    public getState(): PhotoMarkupState {
        this.ensureInitialized();
        return { ...this.state };
    }

    /**
     * Get available markup tools
     */
    public getAvailableTools(): MarkupTool[] {
        return [...MarkupCanvas.DEFAULT_TOOLS];
    }

    /**
     * Get storage statistics
     */
    public async getStorageStats() {
        this.ensureInitialized();
        return await this.storageService.getStorageStats();
    }

    /**
     * Get connection status
     */
    public getConnectionStatus() {
        return this.takIntegration.getConnectionStatus();
    }

    /**
     * Configure TAK Server connection
     */
    public configureTakServer(config: any): void {
        this.takIntegration.configureTakServer(config);
    }

    /**
     * Configure mesh networking
     */
    public configureMeshNetwork(config: any): void {
        this.takIntegration.configureMeshNetwork(config);
    }

    /**
     * Process incoming photo from network
     */
    public async processIncomingPhoto(cotXml: string, photoData?: string): Promise<MarkedUpPhoto | null> {
        this.ensureInitialized();
        
        try {
            const markedUpPhoto = await this.takIntegration.processIncomingPhoto(cotXml, photoData);
            
            if (markedUpPhoto) {
                // Store incoming photo
                await this.storageService.storePhoto(markedUpPhoto);
            }
            
            return markedUpPhoto;
        } catch (error) {
            console.error('Failed to process incoming photo:', error);
            return null;
        }
    }

    /**
     * Retry failed synchronizations
     */
    public async retrySyncQueue(): Promise<void> {
        this.ensureInitialized();
        await this.takIntegration.retrySyncQueue();
    }

    /**
     * Private helper methods
     */

    private ensureInitialized(): void {
        if (!this.isInitialized) {
            throw new PhotoMarkupError(
                'PhotoMarkupManager not initialized',
                PhotoMarkupErrorCodes.PHOTO_CAPTURE_FAILED
            );
        }
    }

    private saveToHistory(): void {
        // Remove any history after current index (for redo functionality)
        this.state.history = this.state.history.slice(0, this.state.historyIndex + 1);
        
        // Add current state to history
        this.state.history.push([...this.state.annotations]);
        this.state.historyIndex = this.state.history.length - 1;

        // Limit history size
        const maxHistorySize = 50;
        if (this.state.history.length > maxHistorySize) {
            this.state.history = this.state.history.slice(-maxHistorySize);
            this.state.historyIndex = this.state.history.length - 1;
        }
    }

    private clearHistory(): void {
        this.state.history = [];
        this.state.historyIndex = -1;
        this.saveToHistory();
    }

    private async autoSaveCurrentPhoto(): Promise<void> {
        if (!this.state.currentPhoto) {
            return;
        }

        try {
            // Debounce auto-save to avoid excessive saves
            if (this.autoSaveTimeout) {
                clearTimeout(this.autoSaveTimeout);
            }

            this.autoSaveTimeout = setTimeout(async () => {
                try {
                    await this.savePhoto();
                } catch (error) {
                    console.warn('Auto-save failed:', error);
                }
            }, 2000); // 2 second delay

        } catch (error) {
            console.warn('Auto-save setup failed:', error);
        }
    }
    private autoSaveTimeout?: ReturnType<typeof setTimeout>;

    private scheduleSync(markedUpPhoto: MarkedUpPhoto): void {
        // Schedule sync with exponential backoff
        setTimeout(async () => {
            try {
                await this.sharePhoto(markedUpPhoto.id, {
                    includeLocation: true,
                    compressionQuality: 0.8,
                    priority: 'normal'
                });
            } catch (error) {
                console.warn('Scheduled sync failed:', error);
            }
        }, 1000); // 1 second delay
    }

    private startAutoSync(): void {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }

        this.syncTimer = setInterval(async () => {
            try {
                await this.retrySyncQueue();
            } catch (error) {
                console.warn('Auto-sync failed:', error);
            }
        }, this.config.syncInterval || 30000);
    }

    private stopAutoSync(): void {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = undefined;
        }
    }

    private emitEvent(event: PhotoMarkupEvent): void {
        this.emit('event', event);
        const eventName = event.type.toLowerCase();
        const anyEvent = event as any;
        if (anyEvent && 'payload' in anyEvent) {
            this.emit(eventName, anyEvent.payload);
        } else {
            this.emit(eventName);
        }
    }

    /**
     * Cleanup resources
     */
    public async cleanup(): Promise<void> {
        try {
            this.stopAutoSync();
            
            if (this.autoSaveTimeout) {
                clearTimeout(this.autoSaveTimeout);
            }

            await this.storageService.cleanup();
            await this.captureService.cleanup();
            this.takIntegration.cleanup();

            this.removeAllListeners();
            this.isInitialized = false;

            // Reset internal state so tests and callers start fresh next init
            this.state = {
                currentPhoto: undefined,
                annotations: [],
                selectedTool: MarkupCanvas.DEFAULT_TOOLS[0],
                isDrawing: false,
                history: [],
                historyIndex: -1
            };

            console.log('PhotoMarkupManager cleanup completed');

        } catch (error) {
            console.error('Cleanup failed:', error);
        }
    }
}
