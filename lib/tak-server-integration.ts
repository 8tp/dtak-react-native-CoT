/**
 * TAK Server Integration Module
 * 
 * Implements TS-1, TS-2, TS-3 for dTAK app:
 * - TS-1: Login experience with JWT exchange and certificate generation
 * - TS-2: Self-location and marker publishing with offline queuing
 * - TS-3: Remote CoT consumption and attachment handling
 */

import { EventEmitter } from 'events';
import TAK, { TAKAPI, CoT } from '../../react-tak/index.native.js';
import { APIAuthPassword, type TAKAuthConfig } from '../../react-tak/lib/auth.js';
import CredentialCommands from '../../react-tak/lib/api/credentials.js';
import FileCommands from '../../react-tak/lib/api/files.js';
import { isReactNative } from '../../react-tak/lib/platform.js';

// React Native secure storage (fallback to AsyncStorage for development)
let SecureStore: {
  setItemAsync: (key: string, value: string) => Promise<void>;
  getItemAsync: (key: string) => Promise<string | null>;
  deleteItemAsync: (key: string) => Promise<void>;
};

if (isReactNative) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    SecureStore = require('expo-secure-store');
  } catch {
    // Fallback for development
    SecureStore = {
      setItemAsync: async (key: string, value: string) => {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
      },
      getItemAsync: async (key: string) => {
        if (typeof localStorage !== 'undefined') {
          return localStorage.getItem(key);
        }
        return null;
      },
      deleteItemAsync: async (key: string) => {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
      }
    };
  }
} else {
  // Node.js fallback for testing
  const storage = new Map<string, string>();
  SecureStore = {
    setItemAsync: async (key: string, value: string) => { storage.set(key, value); },
    getItemAsync: async (key: string) => storage.get(key) || null,
    deleteItemAsync: async (key: string) => { storage.delete(key); }
  };
}

export interface TAKServerConfig {
  serverUrl: string;
  username: string;
  password: string;
}

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  error?: string;
  lastConnected?: Date;
  retryCount: number;
}

export interface LocationUpdate {
  uid: string;
  lat: number;
  lon: number;
  alt?: number;
  course?: number;
  speed?: number;
  timestamp: Date;
  callsign?: string;
}

export interface MarkerUpdate {
  uid: string;
  lat: number;
  lon: number;
  alt?: number;
  type: string;
  callsign: string;
  remarks?: string;
  timestamp: Date;
}

export interface RemoteCoT {
  uid: string;
  type: string;
  lat: number;
  lon: number;
  alt?: number;
  callsign?: string;
  remarks?: string;
  timestamp: Date;
  attachments?: string[];
}

/**
 * TAK Server Integration Manager
 * 
 * Handles authentication, streaming connection, and data synchronization
 * with TAK Server while maintaining offline-first capabilities.
 */
export class TAKServerIntegration extends EventEmitter {
  private config: TAKServerConfig | null = null;
  private api: TAKAPI | null = null;
  private streamingClient: TAK | null = null;
  private connectionState: ConnectionState = {
    status: 'disconnected',
    retryCount: 0
  };
  
  // Offline queue for pending updates
  private pendingLocationUpdates: LocationUpdate[] = [];
  private pendingMarkerUpdates: MarkerUpdate[] = [];
  private syncInProgress = false;
  
  // Retry configuration
  private readonly maxRetries = 5;
  private readonly retryDelayMs = 2000;
  private retryTimeout: NodeJS.Timeout | null = null;
  
  // Storage keys
  private readonly STORAGE_KEYS = {
    JWT_TOKEN: 'dtak_jwt_token',
    CLIENT_CERT: 'dtak_client_cert',
    CLIENT_KEY: 'dtak_client_key',
    CA_CHAIN: 'dtak_ca_chain',
    SERVER_CONFIG: 'dtak_server_config'
  };

  constructor() {
    super();
    this.setupEventHandlers();
  }

  /**
   * TS-1: Login Experience
   * 
   * Takes server URL + username/password, exchanges for JWT,
   * generates client certificates, stores securely, and initializes connections.
   */
  async login(config: TAKServerConfig): Promise<void> {
    try {
      this.updateConnectionState('connecting');
      this.config = config;
      
      // Store server config securely
      await SecureStore.setItemAsync(
        this.STORAGE_KEYS.SERVER_CONFIG, 
        JSON.stringify(config)
      );

      // Initialize TAKAPI with password auth
      const serverUrl = new URL(config.serverUrl);
      this.api = new TAKAPI(serverUrl, new APIAuthPassword(config.username, config.password));
      
      // Initialize auth and get JWT
      await this.api.auth.init(this.api);
      const jwt = (this.api.auth as APIAuthPassword).jwt;
      
      // Store JWT securely
      await SecureStore.setItemAsync(this.STORAGE_KEYS.JWT_TOKEN, jwt);
      
      // Generate client certificates
      const credentials = new CredentialCommands(this.api);
      const certData = await credentials.generate();
      
      // Store certificates securely
      await SecureStore.setItemAsync(this.STORAGE_KEYS.CLIENT_CERT, certData.cert);
      await SecureStore.setItemAsync(this.STORAGE_KEYS.CLIENT_KEY, certData.key);
      await SecureStore.setItemAsync(this.STORAGE_KEYS.CA_CHAIN, JSON.stringify(certData.ca));
      
      // Initialize streaming connection
      await this.initializeStreamingConnection(certData);
      
      this.updateConnectionState('connected');
      this.emit('loginSuccess', { jwt, certificates: certData });
      
      // Start syncing pending updates
      await this.syncPendingUpdates();
      
    } catch (error) {
      this.updateConnectionState('error', error instanceof Error ? error.message : 'Login failed');
      this.emit('loginError', error);
      throw error;
    }
  }

  /**
   * Initialize streaming connection with certificates
   */
  private async initializeStreamingConnection(certData: { cert: string; key: string; ca: string[] }): Promise<void> {
    if (!this.config) throw new Error('No configuration available');
    
    const streamUrl = new URL(this.config.serverUrl);
    streamUrl.protocol = 'ssl:';
    streamUrl.port = '8089'; // Default TAK streaming port
    
    const auth: TAKAuthConfig = {
      cert: certData.cert,
      key: certData.key,
      ca: certData.ca.join('\n'),
      rejectUnauthorized: false // For development with self-signed certs
    };
    
    this.streamingClient = await TAK.connect(streamUrl, auth, {
      id: `dtak-${this.config.username}`,
      type: 'dTAK-Client'
    });
    
    // Handle streaming events
    this.streamingClient.on('secureConnect', () => {
      this.emit('streamConnected');
      void this.syncPendingUpdates();
    });
    
    this.streamingClient.on('cot', (cot: CoT) => {
      this.handleIncomingCoT(cot);
    });
    
    this.streamingClient.on('error', (error: Error) => {
      this.emit('streamError', error);
      this.scheduleReconnect();
    });
    
    this.streamingClient.on('end', () => {
      this.emit('streamDisconnected');
      this.scheduleReconnect();
    });
  }

  /**
   * TS-2: Self-Location and Marker Publishing
   * 
   * Publishes location and markers to TAK Server when online,
   * queues updates when offline with deduplication.
   */
  async publishLocation(location: LocationUpdate): Promise<void> {
    // Add to pending queue with deduplication
    this.dedupeAndAddLocationUpdate(location);
    
    // Try immediate sync if connected
    if (this.connectionState.status === 'connected' && this.streamingClient) {
      await this.syncPendingUpdates();
    }
    
    this.emit('locationQueued', location);
  }

  async publishMarker(marker: MarkerUpdate): Promise<void> {
    // Add to pending queue with deduplication
    this.dedupeAndAddMarkerUpdate(marker);
    
    // Try immediate sync if connected
    if (this.connectionState.status === 'connected' && this.streamingClient) {
      await this.syncPendingUpdates();
    }
    
    this.emit('markerQueued', marker);
  }

  /**
   * Deduplicate and add location update to queue
   */
  private dedupeAndAddLocationUpdate(location: LocationUpdate): void {
    // Remove existing updates for same UID (keep only latest)
    this.pendingLocationUpdates = this.pendingLocationUpdates.filter(
      update => update.uid !== location.uid
    );
    this.pendingLocationUpdates.push(location);
  }

  /**
   * Deduplicate and add marker update to queue
   */
  private dedupeAndAddMarkerUpdate(marker: MarkerUpdate): void {
    // Remove existing updates for same UID (keep only latest)
    this.pendingMarkerUpdates = this.pendingMarkerUpdates.filter(
      update => update.uid !== marker.uid
    );
    this.pendingMarkerUpdates.push(marker);
  }

  /**
   * Sync pending updates to TAK Server
   */
  private async syncPendingUpdates(): Promise<void> {
    if (this.syncInProgress || !this.streamingClient || this.connectionState.status !== 'connected') {
      return;
    }
    
    this.syncInProgress = true;
    
    // Capture updates to sync
    const locationUpdates = [...this.pendingLocationUpdates];
    const markerUpdates = [...this.pendingMarkerUpdates];
    
    try {
      // Clear pending queues
      this.pendingLocationUpdates = [];
      this.pendingMarkerUpdates = [];
      
      // Sync location updates
      for (const location of locationUpdates) {
        const cot = this.createLocationCoT(location);
        await this.streamingClient.write([cot]);
        this.emit('locationSynced', location);
      }
      
      // Sync marker updates
      for (const marker of markerUpdates) {
        const cot = this.createMarkerCoT(marker);
        await this.streamingClient.write([cot]);
        this.emit('markerSynced', marker);
      }
      
      this.emit('syncCompleted', {
        locationCount: locationUpdates.length,
        markerCount: markerUpdates.length
      });
      
    } catch (error) {
      // Re-queue failed updates
      this.pendingLocationUpdates.unshift(...locationUpdates);
      this.pendingMarkerUpdates.unshift(...markerUpdates);
      
      this.emit('syncError', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * TS-3: Remote CoT Consumption
   * 
   * Handles incoming CoT messages from teammates and processes attachments.
   */
  private handleIncomingCoT(cot: CoT): void {
    try {
      const remoteCoT = this.parseRemoteCoT(cot);
      if (remoteCoT) {
        this.emit('remoteCoTReceived', remoteCoT);
        
        // Handle attachments if present
        if (remoteCoT.attachments && remoteCoT.attachments.length > 0) {
          void this.handleAttachments(remoteCoT.attachments);
        }
      }
    } catch (error) {
      this.emit('cotParseError', error);
    }
  }

  /**
   * Parse incoming CoT to RemoteCoT format
   */
  private parseRemoteCoT(cot: CoT): RemoteCoT | null {
    const event = cot.raw.event;
    if (!event || !event._attributes) return null;
    
    const attrs = event._attributes;
    const point = event.point?._attributes;
    
    if (!point) return null;
    
    const remoteCoT: RemoteCoT = {
      uid: String(attrs.uid || ''),
      type: String(attrs.type || ''),
      lat: parseFloat(String(point.lat || '0')),
      lon: parseFloat(String(point.lon || '0')),
      alt: point.hae ? parseFloat(String(point.hae)) : undefined,
      timestamp: new Date(String(attrs.time) || Date.now()),
      callsign: event.detail?.contact?._attributes?.callsign,
      remarks: event.detail?.remarks?._text
    };
    
    // Extract attachment hashes
    const attachments: string[] = [];
    if (event.detail?.fileshare) {
      const fileshares = Array.isArray(event.detail.fileshare) 
        ? event.detail.fileshare 
        : [event.detail.fileshare];
      
      for (const fileshare of fileshares) {
        if (fileshare._attributes?.sha256) {
          attachments.push(fileshare._attributes.sha256);
        }
      }
    }
    
    if (attachments.length > 0) {
      remoteCoT.attachments = attachments;
    }
    
    return remoteCoT;
  }

  /**
   * Handle attachment downloads
   */
  private async handleAttachments(hashes: string[]): Promise<void> {
    if (!this.api) return;
    
    const fileCommands = new FileCommands(this.api);
    
    for (const hash of hashes) {
      try {
        // Get attachment metadata
        const metadata = await fileCommands.meta(hash);
        
        // Download attachment
        const data = await fileCommands.download(hash);
        
        this.emit('attachmentReceived', {
          hash,
          metadata,
          data
        });
      } catch (error) {
        this.emit('attachmentError', { hash, error });
      }
    }
  }

  /**
   * Create CoT message for location update
   */
  private createLocationCoT(location: LocationUpdate): CoT {
    const cotData = {
      event: {
        _attributes: {
          version: '2.0',
          uid: location.uid,
          type: 'a-f-G-U-C', // Friendly ground unit
          time: location.timestamp.toISOString(),
          start: location.timestamp.toISOString(),
          stale: new Date(location.timestamp.getTime() + 300000).toISOString(), // 5 min stale
          how: 'm-g' // Machine generated
        },
        point: {
          _attributes: {
            lat: location.lat,
            lon: location.lon,
            hae: location.alt || 0,
            ce: 10,
            le: 10
          }
        },
        detail: {
          contact: {
            _attributes: {
              callsign: location.callsign || location.uid
            }
          },
          ...(location.course !== undefined || location.speed !== undefined ? {
            track: {
              _attributes: {
                ...(location.course !== undefined && { course: location.course.toString() }),
                ...(location.speed !== undefined && { speed: location.speed.toString() })
              }
            }
          } : {})
        }
      }
    };
    return new CoT(cotData);
  }

  /**
   * Create CoT message for marker update
   */
  private createMarkerCoT(marker: MarkerUpdate): CoT {
    const cotData = {
      event: {
        _attributes: {
          version: '2.0',
          uid: marker.uid,
          type: marker.type,
          time: marker.timestamp.toISOString(),
          start: marker.timestamp.toISOString(),
          stale: new Date(marker.timestamp.getTime() + 3600000).toISOString(), // 1 hour stale
          how: 'm-g'
        },
        point: {
          _attributes: {
            lat: marker.lat,
            lon: marker.lon,
            hae: marker.alt || 0,
            ce: 10,
            le: 10
          }
        },
        detail: {
          contact: {
            _attributes: {
              callsign: marker.callsign
            }
          },
          ...(marker.remarks && {
            remarks: {
              _text: marker.remarks
            }
          })
        }
      }
    };
    return new CoT(cotData);
  }

  /**
   * Connection state management
   */
  private updateConnectionState(status: ConnectionState['status'], error?: string): void {
    this.connectionState = {
      ...this.connectionState,
      status,
      error,
      ...(status === 'connected' && { lastConnected: new Date(), retryCount: 0 })
    };
    
    this.emit('connectionStateChanged', this.connectionState);
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.retryTimeout || this.connectionState.retryCount >= this.maxRetries) {
      return;
    }
    
    const delay = this.retryDelayMs * Math.pow(2, this.connectionState.retryCount);
    this.connectionState.retryCount++;
    
    this.retryTimeout = setTimeout(async () => {
      this.retryTimeout = null;
      
      try {
        if (this.config) {
          await this.reconnect();
        }
      } catch (error) {
        this.emit('reconnectError', error);
        this.scheduleReconnect();
      }
    }, delay);
  }

  /**
   * Reconnect to TAK Server
   */
  async reconnect(): Promise<void> {
    if (!this.config) {
      throw new Error('No configuration available for reconnection');
    }
    
    this.updateConnectionState('connecting');
    
    try {
      // Try to restore from stored credentials first
      const storedConfig = await SecureStore.getItemAsync(this.STORAGE_KEYS.SERVER_CONFIG);
      const storedJWT = await SecureStore.getItemAsync(this.STORAGE_KEYS.JWT_TOKEN);
      const storedCert = await SecureStore.getItemAsync(this.STORAGE_KEYS.CLIENT_CERT);
      const storedKey = await SecureStore.getItemAsync(this.STORAGE_KEYS.CLIENT_KEY);
      const storedCA = await SecureStore.getItemAsync(this.STORAGE_KEYS.CA_CHAIN);
      
      if (storedConfig && storedJWT && storedCert && storedKey && storedCA) {
        // Restore from stored credentials
        this.config = JSON.parse(storedConfig);
        
        const certData = {
          cert: storedCert,
          key: storedKey,
          ca: JSON.parse(storedCA)
        };
        
        await this.initializeStreamingConnection(certData);
        this.updateConnectionState('connected');
        this.emit('reconnectSuccess');
      } else {
        // Full re-login required
        await this.login(this.config);
      }
    } catch (error) {
      this.updateConnectionState('error', error instanceof Error ? error.message : 'Reconnection failed');
      throw error;
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Handle app state changes for connection management
    if (isReactNative && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.connectionState.status === 'error') {
          this.scheduleReconnect();
        }
      });
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Get pending sync counts
   */
  getPendingSyncCounts(): { locations: number; markers: number } {
    return {
      locations: this.pendingLocationUpdates.length,
      markers: this.pendingMarkerUpdates.length
    };
  }

  /**
   * Logout and cleanup
   */
  async logout(): Promise<void> {
    // Clear retry timeout
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    
    // Disconnect streaming client
    if (this.streamingClient) {
      this.streamingClient.destroy();
      this.streamingClient = null;
    }
    
    // Clear stored credentials
    await Promise.all([
      SecureStore.deleteItemAsync(this.STORAGE_KEYS.JWT_TOKEN),
      SecureStore.deleteItemAsync(this.STORAGE_KEYS.CLIENT_CERT),
      SecureStore.deleteItemAsync(this.STORAGE_KEYS.CLIENT_KEY),
      SecureStore.deleteItemAsync(this.STORAGE_KEYS.CA_CHAIN),
      SecureStore.deleteItemAsync(this.STORAGE_KEYS.SERVER_CONFIG)
    ]);
    
    // Reset state
    this.config = null;
    this.api = null;
    this.pendingLocationUpdates = [];
    this.pendingMarkerUpdates = [];
    this.updateConnectionState('disconnected');
    
    this.emit('logoutComplete');
  }

  /**
   * Force sync pending updates
   */
  async forceSync(): Promise<void> {
    await this.syncPendingUpdates();
  }
}

// Export singleton instance
export const takServerIntegration = new TAKServerIntegration();
