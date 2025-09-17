/**
 * TakPhotoIntegration - Integrates photo markup with TAK Server and mesh networking
 * Handles CoT message creation, sharing, and synchronization
 */

import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';
import RNFS from 'react-native-fs';

import CoT from '../cot.js';
import Util from '../utils/util.js';
import { CoTParser } from '../parser.js';
import type { MarkedUpPhoto, TakPhotoCoT, ShareOptions, MarkupAnnotation, PhotoMetadata } from './types';
import { PhotoMarkupError, PhotoMarkupErrorCodes } from './types';

export interface TakServerConfig {
    serverUrl: string;
    username: string;
    password?: string;
    certificate?: string;
    clientCert?: string;
    clientKey?: string;
    trustSelfSigned?: boolean;
}

export interface MeshNetworkConfig {
    nodeId: string;
    networkName: string;
    encryptionKey?: string;
    discoveryPort?: number;
}

export class TakPhotoIntegration {
    private static instance: TakPhotoIntegration;
    private takServerConfig?: TakServerConfig;
    private meshConfig?: MeshNetworkConfig;
    private isConnected = false;
    private syncQueue: MarkedUpPhoto[] = [];

    private constructor() {}

    public static getInstance(): TakPhotoIntegration {
        if (!TakPhotoIntegration.instance) {
            TakPhotoIntegration.instance = new TakPhotoIntegration();
        }
        return TakPhotoIntegration.instance;
    }

    /**
     * Configure TAK Server connection
     */
    public configureTakServer(config: TakServerConfig): void {
        this.takServerConfig = config;
        this.validateTakServerConnection();
    }

    /**
     * Configure mesh networking
     */
    public configureMeshNetwork(config: MeshNetworkConfig): void {
        this.meshConfig = config;
    }

    /**
     * Validate TAK Server connection
     */
    private async validateTakServerConnection(): Promise<boolean> {
        if (!this.takServerConfig) {
            return false;
        }

        try {
            // Implementation would test connection to TAK Server
            // This is a placeholder for actual connection validation
            console.log('Validating TAK Server connection...');
            this.isConnected = true;
            return true;
        } catch (error) {
            console.error('TAK Server connection validation failed:', error);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Create TAK CoT message from marked up photo
     */
    public createPhotoCoT(markedUpPhoto: MarkedUpPhoto): CoT {
        try {
            const { photo, annotations } = markedUpPhoto;
            
            if (!photo.location) {
                throw new PhotoMarkupError(
                    'Photo must have location data for TAK integration',
                    PhotoMarkupErrorCodes.INVALID_ANNOTATION
                );
            }

            const uid = markedUpPhoto.takCoTId || uuidv4();

            const cot = new CoT({
                event: {
                    _attributes: {
                        ...Util.cot_event_attr('b-i-x-i', 'm-g'),
                        uid
                    },
                    point: {
                        _attributes: {
                            lat: photo.location.latitude,
                            lon: photo.location.longitude,
                            hae: photo.location.altitude || 0,
                            ce: photo.location.accuracy || 9999999,
                            le: 9999999
                        }
                    },
                    // Use any to allow custom keys like image/markup without TS complaints
                    detail: {
                        image: {
                            _attributes: {
                                url: photo.uri,
                                name: `photo_${photo.id}.jpg`,
                                size: photo.fileSize,
                                mimeType: photo.mimeType
                            }
                        },
                        markup: {
                            _attributes: { version: '1.0' },
                            annotation: annotations.map((ann) => ({
                                _attributes: {
                                    id: ann.id,
                                    type: ann.type,
                                    coordinates: ann.coordinates.join(','),
                                    style: JSON.stringify(ann.style),
                                    ...(ann.text ? { text: ann.text } : {}),
                                    timestamp: String(ann.timestamp),
                                    author: ann.author
                                }
                            }))
                        },
                        remarks: { _text: `Tactical photo captured at ${new Date(photo.timestamp).toISOString()}` },
                        precisionlocation: { _attributes: { geopointsrc: 'GPS', altsrc: 'GPS' } },
                        contact: { _attributes: { callsign: `dTAK-Photo-${uid.substring(0, 8)}` } }
                    } as any
                }
            } as any);

            // Store TAK CoT ID for reference
            markedUpPhoto.takCoTId = uid;

            return cot;

        } catch (error) {
            console.error('Failed to create photo CoT:', error);
            throw new PhotoMarkupError(
                'Failed to create TAK CoT message',
                PhotoMarkupErrorCodes.TAK_SERVER_ERROR,
                error
            );
        }
    }

    /**
     * Build CoT XML from photo data
     */
    private buildCoTXml(cotData: TakPhotoCoT): string {
        const now = new Date().toISOString();
        const stale = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now

        return `<?xml version="1.0" encoding="UTF-8"?>
<event version="2.0" uid="${cotData.uid}" type="${cotData.type}" how="m-g" 
       time="${now}" start="${now}" stale="${stale}">
    <point lat="${cotData.point.lat}" lon="${cotData.point.lon}" 
           hae="${cotData.point.hae}" ce="${cotData.point.ce}" le="${cotData.point.le}"/>
    <detail>
        <image url="${cotData.detail.image.url}" 
               name="${cotData.detail.image.name}"
               size="${cotData.detail.image.size}"
               mimeType="${cotData.detail.image.mimeType}"/>
        ${cotData.detail.markup ? this.buildMarkupXml(cotData.detail.markup.annotations) : ''}
        <remarks>${cotData.detail.remarks}</remarks>
        <precisionlocation geopointsrc="${cotData.detail.precisionlocation?.geopointsrc}" 
                          altsrc="${cotData.detail.precisionlocation?.altsrc}"/>
        <contact callsign="dTAK-Photo-${cotData.uid.substring(0, 8)}"/>
    </detail>
</event>`;
    }

    /**
     * Build markup XML for annotations
     */
    private buildMarkupXml(annotations: MarkupAnnotation[]): string {
        if (!annotations.length) {
            return '';
        }

        const annotationsXml = annotations.map(annotation => {
            const coords = annotation.coordinates.join(',');
            const style = JSON.stringify(annotation.style);
            
            return `<annotation id="${annotation.id}" 
                                type="${annotation.type}" 
                                coordinates="${coords}"
                                style="${this.escapeXml(style)}"
                                ${annotation.text ? `text="${this.escapeXml(annotation.text)}"` : ''}
                                timestamp="${annotation.timestamp}"
                                author="${this.escapeXml(annotation.author)}"/>`;
        }).join('\n        ');

        return `<markup version="1.0">
        ${annotationsXml}
    </markup>`;
    }

    /**
     * Escape XML special characters
     */
    private escapeXml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Share marked up photo with team members
     */
    public async sharePhoto(
        markedUpPhoto: MarkedUpPhoto,
        options: ShareOptions
    ): Promise<boolean> {
        try {
            // Create CoT message
            const cot = this.createPhotoCoT(markedUpPhoto);

            // Prepare photo file for sharing
            const photoData = await this.preparePhotoForSharing(markedUpPhoto, options);

            // Share via TAK Server if connected
            if (this.isConnected && this.takServerConfig) {
                await this.shareViaTakServer(cot, photoData, options);
            }

            // Share via mesh network if configured
            if (this.meshConfig) {
                await this.shareViaMeshNetwork(cot, photoData, options);
            }

            // Update photo status
            markedUpPhoto.shared = true;
            markedUpPhoto.syncStatus = 'synced';
            markedUpPhoto.updatedAt = Date.now();

            return true;

        } catch (error) {
            console.error('Photo sharing failed:', error);
            markedUpPhoto.syncStatus = 'failed';
            
            // Add to sync queue for retry
            this.syncQueue.push(markedUpPhoto);
            
            throw new PhotoMarkupError(
                'Failed to share photo',
                PhotoMarkupErrorCodes.SYNC_FAILED,
                error
            );
        }
    }

    /**
     * Prepare photo data for sharing (compression, encryption, etc.)
     */
    private async preparePhotoForSharing(
        markedUpPhoto: MarkedUpPhoto,
        options: ShareOptions
    ): Promise<{ photoData: string; metadata: any }> {
        try {
            // Read photo file
            const photoData = await RNFS.readFile(markedUpPhoto.photo.uri, 'base64');
            
            // Compress if needed
            let processedData = photoData;
            if (options.compressionQuality < 1.0) {
                // Implementation would compress the image
                console.log('Compressing photo for sharing...');
            }

            // Encrypt if mesh network requires it
            if (this.meshConfig?.encryptionKey) {
                processedData = this.encryptData(processedData, this.meshConfig.encryptionKey);
            }

            const metadata = {
                originalSize: markedUpPhoto.photo.fileSize,
                compressedSize: processedData.length,
                encrypted: !!this.meshConfig?.encryptionKey,
                annotations: markedUpPhoto.annotations.length,
                location: markedUpPhoto.photo.location,
                timestamp: markedUpPhoto.photo.timestamp
            };

            return { photoData: processedData, metadata };

        } catch (error) {
            throw new PhotoMarkupError(
                'Failed to prepare photo for sharing',
                PhotoMarkupErrorCodes.ENCRYPTION_FAILED,
                error
            );
        }
    }

    /**
     * Share photo via TAK Server
     */
    private async shareViaTakServer(
        cot: CoT,
        photoData: { photoData: string; metadata: any },
        options: ShareOptions
    ): Promise<void> {
        if (!this.takServerConfig) {
            throw new PhotoMarkupError(
                'TAK Server not configured',
                PhotoMarkupErrorCodes.TAK_SERVER_ERROR
            );
        }

        try {
            // Implementation would send CoT message and photo data to TAK Server
            console.log('Sharing photo via TAK Server...');
            
            // Send CoT message
            const cotXml = CoTParser.to_xml(cot);
            console.log('CoT XML:', cotXml);
            
            // Upload photo data
            console.log('Uploading photo data to TAK Server...');
            
            // Set recipients if specified
            if (options.recipients?.length) {
                console.log('Setting recipients:', options.recipients);
            }

        } catch (error) {
            throw new PhotoMarkupError(
                'TAK Server sharing failed',
                PhotoMarkupErrorCodes.TAK_SERVER_ERROR,
                error
            );
        }
    }

    /**
     * Share photo via mesh network
     */
    private async shareViaMeshNetwork(
        cot: CoT,
        photoData: { photoData: string; metadata: any },
        options: ShareOptions
    ): Promise<void> {
        if (!this.meshConfig) {
            throw new PhotoMarkupError(
                'Mesh network not configured',
                PhotoMarkupErrorCodes.NETWORK_ERROR
            );
        }

        try {
            // Implementation would use Ditto SDK or similar for mesh networking
            console.log('Sharing photo via mesh network...');
            
            // Broadcast to mesh network (placeholder)
            console.log('Broadcasting to mesh network:', this.meshConfig.networkName, {
                type: 'photo_share',
                cot: CoTParser.to_xml(cot),
                priority: options.priority
            });

        } catch (error) {
            throw new PhotoMarkupError(
                'Mesh network sharing failed',
                PhotoMarkupErrorCodes.NETWORK_ERROR,
                error
            );
        }
    }

    /**
     * Encrypt data for secure mesh transmission
     */
    private encryptData(data: string, key: string): string {
        try {
            return CryptoJS.AES.encrypt(data, key).toString();
        } catch (error) {
            throw new PhotoMarkupError(
                'Data encryption failed',
                PhotoMarkupErrorCodes.ENCRYPTION_FAILED,
                error
            );
        }
    }

    /**
     * Decrypt data from mesh transmission
     */
    private decryptData(encryptedData: string, key: string): string {
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedData, key);
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
     * Process incoming photo from mesh network or TAK Server
     */
    public async processIncomingPhoto(
        cotXml: string,
        _photoData?: string
    ): Promise<MarkedUpPhoto | null> {
        try {
            void _photoData; // mark parameter as used for lint compliance
            const cot = CoTParser.from_xml(cotXml);
            const geoJson = await CoTParser.to_geojson(cot);
            
            // Extract photo information from CoT
            const detail = cot.raw.event.detail as any;
            if (!detail?.image) {
                return null;
            }

            // Create photo metadata from CoT
            const photoMetadata: PhotoMetadata = {
                id: uuidv4(),
                uri: detail.image._attributes?.url || '',
                width: 0, // Will be set when image is loaded
                height: 0,
                fileSize: Number(detail.image._attributes?.size) || 0,
                mimeType: detail.image._attributes?.mimeType || 'image/jpeg',
                timestamp: Date.now(),
                location: {
                    latitude: Number((geoJson as any).geometry.coordinates[1] || 0),
                    longitude: Number((geoJson as any).geometry.coordinates[0] || 0),
                    altitude: Number((geoJson as any).geometry.coordinates[2] || 0),
                    accuracy: Number((cot.raw.event.point as any)._attributes?.ce || 9999999),
                    timestamp: Date.now()
                }
            };

            // Extract annotations from markup
            const annotations: MarkupAnnotation[] = [];
            if (detail.markup?.annotation) {
                const annotationData = Array.isArray(detail.markup.annotation) 
                    ? detail.markup.annotation 
                    : [detail.markup.annotation];
                
                annotationData.forEach((ann: any) => {
                    try {
                        annotations.push({
                            id: ann._attributes?.id || uuidv4(),
                            type: ann._attributes?.type,
                            coordinates: String(ann._attributes?.coordinates || '')
                                .split(',')
                                .filter((v: string) => v.length)
                                .map(Number),
                            style: JSON.parse(ann._attributes?.style || '{}'),
                            text: ann._attributes?.text || undefined,
                            timestamp: parseInt(ann._attributes?.timestamp) || Date.now(),
                            author: ann._attributes?.author || 'unknown'
                        });
                    } catch (error) {
                        console.warn('Failed to parse annotation:', error);
                    }
                });
            }

            const markedUpPhoto: MarkedUpPhoto = {
                id: uuidv4(),
                photo: photoMetadata,
                annotations,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                author: 'remote-user',
                shared: true,
                syncStatus: 'synced',
                takCoTId: cot.raw.event._attributes.uid
            };

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
        if (!this.syncQueue.length) {
            return;
        }

        console.log(`Retrying ${this.syncQueue.length} failed synchronizations...`);
        
        const retryQueue = [...this.syncQueue];
        this.syncQueue = [];

        for (const photo of retryQueue) {
            try {
                await this.sharePhoto(photo, {
                    includeLocation: true,
                    compressionQuality: 0.8,
                    priority: 'normal'
                });
                console.log(`Successfully synced photo ${photo.id}`);
            } catch (error) {
                console.error(`Retry failed for photo ${photo.id}:`, error);
                // Add back to queue if still failing
                this.syncQueue.push(photo);
            }
        }
    }

    /**
     * Get connection status
     */
    public getConnectionStatus(): {
        takServer: boolean;
        meshNetwork: boolean;
        queuedItems: number;
    } {
        return {
            takServer: this.isConnected,
            meshNetwork: !!this.meshConfig,
            queuedItems: this.syncQueue.length
        };
    }

    /**
     * Cleanup resources
     */
    public cleanup(): void {
        this.syncQueue = [];
        this.isConnected = false;
    }
}
