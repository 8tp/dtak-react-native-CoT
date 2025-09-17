/**
 * dTAK Photo Markup Feature - Main Export
 * Geo-tagged photo capture, markup, and team sharing for tactical awareness
 */

// Main manager
export { PhotoMarkupManager } from './PhotoMarkupManager';

// Core services
export { PhotoCaptureService } from './PhotoCaptureService';
export { MarkupCanvas } from './MarkupCanvas';
export { TakPhotoIntegration } from './TakPhotoIntegration';
export { OfflineStorageService } from './OfflineStorageService';

// Types and interfaces
export * from './types';

// Re-export for convenience
export { PhotoMarkupManager as default } from './PhotoMarkupManager';
