/**
 * TAK Server Integration Tests
 * 
 * Unit and integration tests for TS-1, TS-2, TS-3 features:
 * - Login flow with JWT exchange and certificate generation
 * - Location and marker publishing with offline queuing
 * - Remote CoT consumption and attachment handling
 * - Connection state management and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TAKServerIntegration, type TAKServerConfig, type LocationUpdate, type MarkerUpdate } from '../lib/tak-server-integration';

// Mock dependencies
vi.mock('../../react-tak/index.native.js', () => ({
  TAK: {
    connect: vi.fn()
  },
  TAKAPI: vi.fn(),
  CoT: vi.fn()
}));

vi.mock('../../react-tak/lib/auth.js', () => ({
  APIAuthPassword: vi.fn()
}));

vi.mock('../../react-tak/lib/api/credentials.js', () => ({
  default: vi.fn()
}));

vi.mock('../../react-tak/lib/platform.js', () => ({
  isReactNative: false
}));

// Mock secure storage
const mockSecureStore = {
  setItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  deleteItemAsync: vi.fn()
};

// Mock TAK client
const mockTAKClient = {
  on: vi.fn(),
  write: vi.fn(),
  destroy: vi.fn()
};

// Mock TAKAPI
const mockTAKAPI = {
  auth: {
    init: vi.fn(),
    jwt: 'mock-jwt-token'
  }
};

// Mock credentials
const mockCredentials = {
  generate: vi.fn().mockResolvedValue({
    cert: 'mock-cert',
    key: 'mock-key',
    ca: ['mock-ca']
  })
};

describe('TAKServerIntegration', () => {
  let integration: TAKServerIntegration;
  let mockConfig: TAKServerConfig;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Setup mocks using dynamic imports
    const takModule = await import('../../react-tak/index.native.js');
    const authModule = await import('../../react-tak/lib/auth.js');
    const credentialsModule = await import('../../react-tak/lib/api/credentials.js');
    
    vi.mocked(takModule.TAK.connect).mockResolvedValue(mockTAKClient);
    vi.mocked(takModule.TAKAPI).mockImplementation(() => mockTAKAPI);
    vi.mocked(authModule.APIAuthPassword).mockImplementation(() => ({ jwt: 'mock-jwt-token' }));
    vi.mocked(credentialsModule.default).mockImplementation(() => mockCredentials);
    
    // Mock secure storage globally
    (globalThis as any).SecureStore = mockSecureStore;
    
    integration = new TAKServerIntegration();
    mockConfig = {
      serverUrl: 'https://localhost:8443',
      username: 'testuser',
      password: 'testpass'
    };
  });

  afterEach(() => {
    integration.removeAllListeners();
  });

  describe('TS-1: Login Experience', () => {
    it('should successfully login with valid credentials', async () => {
      // Setup mocks
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);
      mockTAKAPI.auth.init.mockResolvedValue(undefined);
      
      const loginSuccessPromise = new Promise(resolve => {
        integration.once('loginSuccess', resolve);
      });
      
      // Execute login
      await integration.login(mockConfig);
      
      // Wait for success event
      await loginSuccessPromise;
      
      // Verify API initialization
      expect(mockTAKAPI.auth.init).toHaveBeenCalledWith(mockTAKAPI);
      
      // Verify certificate generation
      expect(mockCredentials.generate).toHaveBeenCalled();
      
      // Verify secure storage
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'dtak_server_config',
        JSON.stringify(mockConfig)
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'dtak_jwt_token',
        'mock-jwt-token'
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'dtak_client_cert',
        'mock-cert'
      );
      
      // Verify connection state
      expect(integration.getConnectionState().status).toBe('connected');
    });

    it('should handle login errors gracefully', async () => {
      // Setup error
      const loginError = new Error('Authentication failed');
      mockTAKAPI.auth.init.mockRejectedValue(loginError);
      
      const loginErrorPromise = new Promise(resolve => {
        integration.once('loginError', resolve);
      });
      
      // Execute login and expect error
      await expect(integration.login(mockConfig)).rejects.toThrow('Authentication failed');
      
      // Wait for error event
      await loginErrorPromise;
      
      // Verify error state
      expect(integration.getConnectionState().status).toBe('error');
      expect(integration.getConnectionState().error).toBe('Authentication failed');
    });

    it('should store credentials securely', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);
      mockTAKAPI.auth.init.mockResolvedValue(undefined);
      
      await integration.login(mockConfig);
      
      // Verify all credentials are stored
      const expectedCalls = [
        ['dtak_server_config', JSON.stringify(mockConfig)],
        ['dtak_jwt_token', 'mock-jwt-token'],
        ['dtak_client_cert', 'mock-cert'],
        ['dtak_client_key', 'mock-key'],
        ['dtak_ca_chain', JSON.stringify(['mock-ca'])]
      ];
      
      expectedCalls.forEach(([key, value]) => {
        expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(key, value);
      });
    });
  });

  describe('TS-2: Location and Marker Publishing', () => {
    beforeEach(async () => {
      // Setup connected state
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);
      mockTAKAPI.auth.init.mockResolvedValue(undefined);
      await integration.login(mockConfig);
    });

    it('should queue location updates when offline', async () => {
      // Simulate offline state
      integration['connectionState'].status = 'disconnected';
      
      const location: LocationUpdate = {
        uid: 'test-uid',
        lat: 37.7749,
        lon: -122.4194,
        alt: 10,
        timestamp: new Date(),
        callsign: 'TestUser'
      };
      
      await integration.publishLocation(location);
      
      // Verify location is queued
      const pendingCounts = integration.getPendingSyncCounts();
      expect(pendingCounts.locations).toBe(1);
    });

    it('should deduplicate location updates by UID', async () => {
      integration['connectionState'].status = 'disconnected';
      
      const location1: LocationUpdate = {
        uid: 'test-uid',
        lat: 37.7749,
        lon: -122.4194,
        timestamp: new Date(),
        callsign: 'TestUser'
      };
      
      const location2: LocationUpdate = {
        uid: 'test-uid',
        lat: 37.7750,
        lon: -122.4195,
        timestamp: new Date(),
        callsign: 'TestUser'
      };
      
      await integration.publishLocation(location1);
      await integration.publishLocation(location2);
      
      // Should only have one location (latest)
      const pendingCounts = integration.getPendingSyncCounts();
      expect(pendingCounts.locations).toBe(1);
    });

    it('should sync location updates when connected', async () => {
      const location: LocationUpdate = {
        uid: 'test-uid',
        lat: 37.7749,
        lon: -122.4194,
        timestamp: new Date(),
        callsign: 'TestUser'
      };
      
      const syncPromise = new Promise(resolve => {
        integration.once('locationSynced', resolve);
      });
      
      await integration.publishLocation(location);
      
      // Wait for sync
      await syncPromise;
      
      // Verify TAK client write was called
      expect(mockTAKClient.write).toHaveBeenCalled();
      
      // Verify queue is empty
      const pendingCounts = integration.getPendingSyncCounts();
      expect(pendingCounts.locations).toBe(0);
    });

    it('should queue and sync marker updates', async () => {
      const marker: MarkerUpdate = {
        uid: 'marker-1',
        lat: 37.7749,
        lon: -122.4194,
        type: 'b-m-p-s-m',
        callsign: 'Test Marker',
        remarks: 'Test marker description',
        timestamp: new Date()
      };
      
      const syncPromise = new Promise(resolve => {
        integration.once('markerSynced', resolve);
      });
      
      await integration.publishMarker(marker);
      
      // Wait for sync
      await syncPromise;
      
      // Verify TAK client write was called
      expect(mockTAKClient.write).toHaveBeenCalled();
    });
  });

  describe('TS-3: Remote CoT Consumption', () => {
    beforeEach(async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);
      mockTAKAPI.auth.init.mockResolvedValue(undefined);
      await integration.login(mockConfig);
    });

    it('should parse incoming CoT messages', () => {
      const mockCoT = {
        raw: {
          event: {
            _attributes: {
              uid: 'remote-user-1',
              type: 'a-f-G-U-C',
              time: '2023-01-01T12:00:00Z'
            },
            point: {
              _attributes: {
                lat: '37.7749',
                lon: '-122.4194',
                hae: '10'
              }
            },
            detail: {
              contact: {
                _attributes: {
                  callsign: 'RemoteUser'
                }
              },
              remarks: {
                _text: 'Remote user location'
              }
            }
          }
        }
      };
      
      const remoteCoTPromise = new Promise(resolve => {
        integration.once('remoteCoTReceived', resolve);
      });
      
      // Simulate incoming CoT
      integration['handleIncomingCoT'](mockCoT as any);
      
      return remoteCoTPromise.then((remoteCoT: any) => {
        expect(remoteCoT.uid).toBe('remote-user-1');
        expect(remoteCoT.callsign).toBe('RemoteUser');
        expect(remoteCoT.lat).toBe(37.7749);
        expect(remoteCoT.lon).toBe(-122.4194);
        expect(remoteCoT.remarks).toBe('Remote user location');
      });
    });

    it('should handle CoT messages with attachments', () => {
      const mockCoTWithAttachment = {
        raw: {
          event: {
            _attributes: {
              uid: 'remote-user-2',
              type: 'a-f-G-U-C',
              time: '2023-01-01T12:00:00Z'
            },
            point: {
              _attributes: {
                lat: '37.7749',
                lon: '-122.4194'
              }
            },
            detail: {
              contact: {
                _attributes: {
                  callsign: 'RemoteUser2'
                }
              },
              fileshare: {
                _attributes: {
                  sha256: 'abc123def456'
                }
              }
            }
          }
        }
      };
      
      const remoteCoTPromise = new Promise(resolve => {
        integration.once('remoteCoTReceived', resolve);
      });
      
      integration['handleIncomingCoT'](mockCoTWithAttachment as any);
      
      return remoteCoTPromise.then((remoteCoT: any) => {
        expect(remoteCoT.attachments).toEqual(['abc123def456']);
      });
    });
  });

  describe('Connection Management', () => {
    it('should handle connection state changes', () => {
      const states: string[] = [];
      
      integration.on('connectionStateChanged', (state) => {
        states.push(state.status);
      });
      
      integration['updateConnectionState']('connecting');
      integration['updateConnectionState']('connected');
      integration['updateConnectionState']('error', 'Test error');
      
      expect(states).toEqual(['connecting', 'connected', 'error']);
    });

    it('should attempt reconnection on connection loss', async () => {
      // Setup connected state
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);
      mockSecureStore.getItemAsync.mockImplementation((key) => {
        const values: Record<string, string> = {
          'dtak_server_config': JSON.stringify(mockConfig),
          'dtak_jwt_token': 'mock-jwt-token',
          'dtak_client_cert': 'mock-cert',
          'dtak_client_key': 'mock-key',
          'dtak_ca_chain': JSON.stringify(['mock-ca'])
        };
        return Promise.resolve(values[key] || null);
      });
      
      mockTAKAPI.auth.init.mockResolvedValue(undefined);
      await integration.login(mockConfig);
      
      // Simulate connection loss
      integration['scheduleReconnect']();
      
      // Verify retry count increases
      expect(integration.getConnectionState().retryCount).toBeGreaterThan(0);
    });

    it('should cleanup on logout', async () => {
      // Setup connected state
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);
      mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);
      mockTAKAPI.auth.init.mockResolvedValue(undefined);
      
      await integration.login(mockConfig);
      await integration.logout();
      
      // Verify cleanup
      expect(mockTAKClient.destroy).toHaveBeenCalled();
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledTimes(5); // All stored items
      expect(integration.getConnectionState().status).toBe('disconnected');
    });
  });

  describe('Error Handling', () => {
    it('should handle streaming connection errors', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);
      mockTAKAPI.auth.init.mockResolvedValue(undefined);
      
      await integration.login(mockConfig);
      
      const errorPromise = new Promise(resolve => {
        integration.once('streamError', resolve);
      });
      
      // Simulate streaming error
      const mockError = new Error('Streaming connection lost');
      const errorHandler = mockTAKClient.on.mock.calls.find(call => call[0] === 'error')?.[1];
      errorHandler?.(mockError);
      
      const receivedError = await errorPromise;
      expect(receivedError).toBe(mockError);
    });

    it('should handle sync errors gracefully', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);
      mockTAKAPI.auth.init.mockResolvedValue(undefined);
      mockTAKClient.write.mockRejectedValue(new Error('Sync failed'));
      
      await integration.login(mockConfig);
      
      const location: LocationUpdate = {
        uid: 'test-uid',
        lat: 37.7749,
        lon: -122.4194,
        timestamp: new Date(),
        callsign: 'TestUser'
      };
      
      const errorPromise = new Promise(resolve => {
        integration.once('syncError', resolve);
      });
      
      await integration.publishLocation(location);
      
      // Wait for sync error
      await errorPromise;
      
      // Verify location is still in queue
      const pendingCounts = integration.getPendingSyncCounts();
      expect(pendingCounts.locations).toBe(1);
    });
  });

  describe('CoT Message Creation', () => {
    beforeEach(async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);
      mockTAKAPI.auth.init.mockResolvedValue(undefined);
      await integration.login(mockConfig);
    });

    it('should create valid location CoT messages', () => {
      const location: LocationUpdate = {
        uid: 'test-uid',
        lat: 37.7749,
        lon: -122.4194,
        alt: 10,
        course: 90,
        speed: 2.5,
        timestamp: new Date('2023-01-01T12:00:00Z'),
        callsign: 'TestUser'
      };
      
      const cot = integration['createLocationCoT'](location);
      
      expect(cot.raw.event._attributes.uid).toBe('test-uid');
      expect(cot.raw.event._attributes.type).toBe('a-f-G-U-C');
      expect(cot.raw.event.point._attributes.lat).toBe('37.7749');
      expect(cot.raw.event.point._attributes.lon).toBe('-122.4194');
      expect(cot.raw.event.point._attributes.hae).toBe('10');
      expect(cot.raw.event.detail.contact._attributes.callsign).toBe('TestUser');
      expect(cot.raw.event.detail.track._attributes.course).toBe('90');
      expect(cot.raw.event.detail.track._attributes.speed).toBe('2.5');
    });

    it('should create valid marker CoT messages', () => {
      const marker: MarkerUpdate = {
        uid: 'marker-1',
        lat: 37.7749,
        lon: -122.4194,
        alt: 5,
        type: 'b-m-p-s-m',
        callsign: 'Test Marker',
        remarks: 'Test marker description',
        timestamp: new Date('2023-01-01T12:00:00Z')
      };
      
      const cot = integration['createMarkerCoT'](marker);
      
      expect(cot.raw.event._attributes.uid).toBe('marker-1');
      expect(cot.raw.event._attributes.type).toBe('b-m-p-s-m');
      expect(cot.raw.event.point._attributes.lat).toBe('37.7749');
      expect(cot.raw.event.point._attributes.lon).toBe('-122.4194');
      expect(cot.raw.event.detail.contact._attributes.callsign).toBe('Test Marker');
      expect(cot.raw.event.detail.remarks._text).toBe('Test marker description');
    });
  });
});
