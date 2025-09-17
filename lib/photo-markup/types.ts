/**
 * Type definitions for the dTAK Photo Markup feature
 * Supports geo-tagged photo capture, markup annotations, and team sharing
 */

export interface GeoLocation {
    latitude: number;
    longitude: number;
    altitude?: number;
    accuracy?: number;
    timestamp: number;
}

export interface PhotoMetadata {
    id: string;
    uri: string;
    width: number;
    height: number;
    fileSize: number;
    mimeType: string;
    timestamp: number;
    location?: GeoLocation;
    deviceInfo?: {
        make?: string;
        model?: string;
        orientation?: number;
    };
}

export interface MarkupAnnotation {
    id: string;
    type: 'circle' | 'arrow' | 'text' | 'rectangle' | 'freehand';
    coordinates: number[]; // [x, y] or [x1, y1, x2, y2] depending on type
    style: AnnotationStyle;
    text?: string; // For text annotations
    timestamp: number;
    author: string;
}

export interface AnnotationStyle {
    strokeColor: string;
    strokeWidth: number;
    fillColor?: string;
    opacity: number;
    fontSize?: number; // For text annotations
    fontFamily?: string;
}

export interface MarkedUpPhoto {
    id: string;
    photo: PhotoMetadata;
    annotations: MarkupAnnotation[];
    createdAt: number;
    updatedAt: number;
    author: string;
    shared: boolean;
    syncStatus: 'pending' | 'synced' | 'failed';
    takCoTId?: string; // Associated TAK CoT message ID
}

export interface PhotoCaptureOptions {
    quality: number; // 0-1
    maxWidth?: number;
    maxHeight?: number;
    includeLocation: boolean;
    includeExif: boolean;
}

export interface MarkupTool {
    type: MarkupAnnotation['type'];
    name: string;
    icon: string;
    defaultStyle: AnnotationStyle;
}

export interface PhotoMarkupState {
    currentPhoto?: PhotoMetadata;
    annotations: MarkupAnnotation[];
    selectedTool: MarkupTool;
    isDrawing: boolean;
    history: MarkupAnnotation[][];
    historyIndex: number;
}

export interface ShareOptions {
    recipients?: string[]; // TAK UIDs or mesh node IDs
    includeLocation: boolean;
    compressionQuality: number;
    attachToMission?: string; // Mission ID
    priority: 'low' | 'normal' | 'high' | 'urgent';
}

// TAK CoT integration types
export interface TakPhotoCoT {
    uid: string;
    type: 'b-i-x-i'; // QuickPic CoT type
    point: {
        lat: number;
        lon: number;
        hae?: number;
        ce?: number;
        le?: number;
    };
    detail: {
        image: {
            url: string;
            name: string;
            size: number;
            mimeType: string;
        };
        markup?: {
            annotations: MarkupAnnotation[];
            version: string;
        };
        remarks?: string;
        precisionlocation?: {
            geopointsrc: string;
            altsrc: string;
        };
    };
}

// Offline storage types
export interface StoredPhotoMarkup {
    id: string;
    photoPath: string;
    thumbnailPath?: string;
    markupData: MarkedUpPhoto;
    encryptionKey?: string; // For secure storage
    syncAttempts: number;
    lastSyncAttempt?: number;
}

export interface PhotoMarkupConfig {
    maxPhotoSize: number; // bytes
    thumbnailSize: { width: number; height: number };
    compressionQuality: number;
    encryptionEnabled: boolean;
    autoSync: boolean;
    retryAttempts: number;
    retryDelay: number; // milliseconds
}

// Event types for the photo markup system
export type PhotoMarkupEvent = 
    | { type: 'PHOTO_CAPTURED'; payload: PhotoMetadata }
    | { type: 'ANNOTATION_ADDED'; payload: MarkupAnnotation }
    | { type: 'ANNOTATION_UPDATED'; payload: MarkupAnnotation }
    | { type: 'ANNOTATION_DELETED'; payload: string }
    | { type: 'PHOTO_SHARED'; payload: { photoId: string; recipients: string[] } }
    | { type: 'SYNC_STATUS_CHANGED'; payload: { photoId: string; status: MarkedUpPhoto['syncStatus'] } }
    | { type: 'TOOL_SELECTED'; payload: MarkupTool }
    | { type: 'UNDO_REQUESTED' }
    | { type: 'REDO_REQUESTED' }
    | { type: 'CLEAR_ANNOTATIONS' };

// Error types
export class PhotoMarkupError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: any
    ) {
        super(message);
        this.name = 'PhotoMarkupError';
    }
}

export const PhotoMarkupErrorCodes = {
    CAMERA_PERMISSION_DENIED: 'CAMERA_PERMISSION_DENIED',
    LOCATION_PERMISSION_DENIED: 'LOCATION_PERMISSION_DENIED',
    PHOTO_CAPTURE_FAILED: 'PHOTO_CAPTURE_FAILED',
    STORAGE_FULL: 'STORAGE_FULL',
    NETWORK_ERROR: 'NETWORK_ERROR',
    ENCRYPTION_FAILED: 'ENCRYPTION_FAILED',
    INVALID_ANNOTATION: 'INVALID_ANNOTATION',
    SYNC_FAILED: 'SYNC_FAILED',
    TAK_SERVER_ERROR: 'TAK_SERVER_ERROR'
} as const;
