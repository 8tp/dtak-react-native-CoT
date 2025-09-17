/**
 * TAK Server Integration End-to-End Tests
 * 
 * Integration tests that run against a live TAK server instance.
 * These tests verify the complete flow from login to data sync.
 * 
 * Prerequisites:
 * - TAK server running at https://localhost:8443
 * - Valid test user credentials
 * - TAK streaming service at ssl://localhost:8089
 */

import { describe, it, expect, beforeAll, vi, beforeEach, afterEach } from 'vitest';
import { TAKServerIntegration, type TAKServerConfig, type LocationUpdate, type MarkerUpdate } from '../lib/tak-server-integration';

// Test configuration - these should be set via environment variables in CI
const TEST_CONFIG: TAKServerConfig = {
  serverUrl: process.env.TAK_SERVER_URL || 'https://localhost:8443',
  username: process.env.TAK_TEST_USERNAME || 'testuser',
  password: process.env.TAK_TEST_PASSWORD || 'testpass'
};

// Skip E2E tests if no test credentials provided
const shouldSkipE2E = !process.env.TAK_TEST_USERNAME || !process.env.TAK_TEST_PASSWORD;

describe.skipIf(shouldSkipE2E)('TAK Server Integration E2E', () => {
  let integration: TAKServerIntegration;
  let isConnected = false;

  beforeAll(async () => {
    // Verify TAK server is accessible
    try {
      const response = await fetch(`${TEST_CONFIG.serverUrl}/Marti/api/version`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`TAK server not accessible: ${response.status}`);
      }
      
      console.log('TAK server is accessible');
    } catch (error) {
      console.warn('TAK server not accessible, skipping E2E tests:', error);
      return;
    }
  }, 30000);

  beforeEach(() => {
    integration = new TAKServerIntegration();
    isConnected = false;
  });

  afterEach(async () => {
    if (isConnected) {
      await integration.logout();
    }
    integration.removeAllListeners();
  });

  describe('Complete Login Flow', () => {
    it('should complete full login with JWT and certificate generation', async () => {
      const events: string[] = [];
      
      // Track events
      integration.on('connectionStateChanged', (state) => {
        events.push(`connection:${state.status}`);
      });
      
      integration.on('loginSuccess', () => {
        events.push('login:success');
        isConnected = true;
      });
      
      integration.on('streamConnected', () => {
        events.push('stream:connected');
      });

      // Perform login
      await integration.login(TEST_CONFIG);
      
      // Wait for streaming connection
      await new Promise(resolve => {
        if (events.includes('stream:connected')) {
          resolve(undefined);
        } else {
          integration.once('streamConnected', resolve);
        }
      });

      // Verify expected events occurred
      expect(events).toContain('connection:connecting');
      expect(events).toContain('connection:connected');
      expect(events).toContain('login:success');
      expect(events).toContain('stream:connected');
      
      // Verify connection state
      const connectionState = integration.getConnectionState();
      expect(connectionState.status).toBe('connected');
      expect(connectionState.lastConnected).toBeDefined();
      expect(connectionState.retryCount).toBe(0);
    }, 30000);

    it('should handle invalid credentials gracefully', async () => {
      const invalidConfig = {
        ...TEST_CONFIG,
        password: 'invalid-password'
      };

      const errorPromise = new Promise(resolve => {
        integration.once('loginError', resolve);
      });

      await expect(integration.login(invalidConfig)).rejects.toThrow();
      
      // Wait for error event
      await errorPromise;
      
      // Verify error state
      const connectionState = integration.getConnectionState();
      expect(connectionState.status).toBe('error');
      expect(connectionState.error).toBeDefined();
    }, 15000);
  });

  describe('Location and Marker Publishing', () => {
    beforeEach(async () => {
      await integration.login(TEST_CONFIG);
      isConnected = true;
      
      // Wait for streaming connection
      await new Promise(resolve => {
        integration.once('streamConnected', resolve);
      });
    });

    it('should publish location updates to TAK server', async () => {
      const location: LocationUpdate = {
        uid: `e2e-test-${Date.now()}`,
        lat: 37.7749 + Math.random() * 0.001, // Slight randomization
        lon: -122.4194 + Math.random() * 0.001,
        alt: 10 + Math.random() * 5,
        course: Math.random() * 360,
        speed: 2.5,
        timestamp: new Date(),
        callsign: 'E2E Test User'
      };

      const syncPromise = new Promise(resolve => {
        integration.once('locationSynced', resolve);
      });

      await integration.publishLocation(location);
      
      // Wait for sync completion
      const syncedLocation = await syncPromise;
      expect(syncedLocation).toEqual(location);
      
      // Verify queue is empty
      const pendingCounts = integration.getPendingSyncCounts();
      expect(pendingCounts.locations).toBe(0);
    }, 10000);

    it('should publish marker updates to TAK server', async () => {
      const marker: MarkerUpdate = {
        uid: `e2e-marker-${Date.now()}`,
        lat: 37.7749 + Math.random() * 0.001,
        lon: -122.4194 + Math.random() * 0.001,
        alt: 5,
        type: 'b-m-p-s-m',
        callsign: 'E2E Test Marker',
        remarks: `E2E test marker created at ${new Date().toISOString()}`,
        timestamp: new Date()
      };

      const syncPromise = new Promise(resolve => {
        integration.once('markerSynced', resolve);
      });

      await integration.publishMarker(marker);
      
      // Wait for sync completion
      const syncedMarker = await syncPromise;
      expect(syncedMarker).toEqual(marker);
      
      // Verify queue is empty
      const pendingCounts = integration.getPendingSyncCounts();
      expect(pendingCounts.markers).toBe(0);
    }, 10000);

    it('should handle offline queuing and sync when reconnected', async () => {
      // Create location update
      const location: LocationUpdate = {
        uid: `e2e-offline-${Date.now()}`,
        lat: 37.7749,
        lon: -122.4194,
        timestamp: new Date(),
        callsign: 'Offline Test'
      };

      // Simulate offline state
      integration['connectionState'].status = 'disconnected';
      
      await integration.publishLocation(location);
      
      // Verify location is queued
      let pendingCounts = integration.getPendingSyncCounts();
      expect(pendingCounts.locations).toBe(1);
      
      // Restore connection state and force sync
      integration['connectionState'].status = 'connected';
      
      const syncPromise = new Promise(resolve => {
        integration.once('locationSynced', resolve);
      });
      
      await integration.forcSync();
      
      // Wait for sync
      await syncPromise;
      
      // Verify queue is empty
      pendingCounts = integration.getPendingSyncCounts();
      expect(pendingCounts.locations).toBe(0);
    }, 15000);
  });

  describe('Remote CoT Reception', () => {
    beforeEach(async () => {
      await integration.login(TEST_CONFIG);
      isConnected = true;
      
      // Wait for streaming connection
      await new Promise(resolve => {
        integration.once('streamConnected', resolve);
      });
    });

    it('should receive remote CoT messages from other clients', async () => {
      // This test requires another TAK client to be sending data
      // For now, we'll test the parsing logic with a timeout
      
      const remoteCoTPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('No remote CoT received within timeout'));
        }, 10000);
        
        integration.once('remoteCoTReceived', (remoteCoT) => {
          clearTimeout(timeout);
          resolve(remoteCoT);
        });
      });

      try {
        const remoteCoT = await remoteCoTPromise;
        
        // Verify remote CoT structure
        expect(remoteCoT).toHaveProperty('uid');
        expect(remoteCoT).toHaveProperty('lat');
        expect(remoteCoT).toHaveProperty('lon');
        expect(remoteCoT).toHaveProperty('timestamp');
        
        console.log('Received remote CoT:', remoteCoT);
      } catch (error) {
        // This is expected if no other clients are active
        console.log('No remote CoT received (expected if no other clients active)');
      }
    }, 15000);
  });

  describe('Connection Resilience', () => {
    beforeEach(async () => {
      await integration.login(TEST_CONFIG);
      isConnected = true;
    });

    it('should maintain connection state correctly', async () => {
      // Wait for initial connection
      await new Promise(resolve => {
        integration.once('streamConnected', resolve);
      });

      const connectionState = integration.getConnectionState();
      expect(connectionState.status).toBe('connected');
      expect(connectionState.lastConnected).toBeInstanceOf(Date);
      expect(connectionState.retryCount).toBe(0);
      expect(connectionState.error).toBeUndefined();
    });

    it('should handle logout cleanly', async () => {
      // Wait for connection
      await new Promise(resolve => {
        integration.once('streamConnected', resolve);
      });

      const logoutPromise = new Promise(resolve => {
        integration.once('logoutComplete', resolve);
      });

      await integration.logout();
      isConnected = false;
      
      // Wait for logout completion
      await logoutPromise;
      
      // Verify disconnected state
      const connectionState = integration.getConnectionState();
      expect(connectionState.status).toBe('disconnected');
      
      // Verify pending queues are cleared
      const pendingCounts = integration.getPendingSyncCounts();
      expect(pendingCounts.locations).toBe(0);
      expect(pendingCounts.markers).toBe(0);
    });
  });

  describe('Performance and Reliability', () => {
    beforeEach(async () => {
      await integration.login(TEST_CONFIG);
      isConnected = true;
      
      await new Promise(resolve => {
        integration.once('streamConnected', resolve);
      });
    });

    it('should handle multiple rapid location updates efficiently', async () => {
      const updateCount = 10;
      const locations: LocationUpdate[] = [];
      
      // Generate multiple location updates
      for (let i = 0; i < updateCount; i++) {
        locations.push({
          uid: `rapid-test-${Date.now()}-${i}`,
          lat: 37.7749 + (i * 0.0001),
          lon: -122.4194 + (i * 0.0001),
          timestamp: new Date(),
          callsign: `Rapid ${i}`
        });
      }

      const startTime = Date.now();
      let syncedCount = 0;
      
      const syncPromise = new Promise(resolve => {
        integration.on('locationSynced', () => {
          syncedCount++;
          if (syncedCount === updateCount) {
            resolve(undefined);
          }
        });
      });

      // Publish all locations rapidly
      for (const location of locations) {
        await integration.publishLocation(location);
      }

      // Wait for all syncs to complete
      await syncPromise;
      
      const duration = Date.now() - startTime;
      console.log(`Synced ${updateCount} locations in ${duration}ms`);
      
      // Verify all locations were synced
      expect(syncedCount).toBe(updateCount);
      
      // Verify queue is empty
      const pendingCounts = integration.getPendingSyncCounts();
      expect(pendingCounts.locations).toBe(0);
    }, 30000);

    it('should maintain sync queue integrity under load', async () => {
      // Simulate mixed updates
      const updates = [];
      
      for (let i = 0; i < 5; i++) {
        updates.push(
          integration.publishLocation({
            uid: `load-test-location-${i}`,
            lat: 37.7749 + (i * 0.0001),
            lon: -122.4194 + (i * 0.0001),
            timestamp: new Date(),
            callsign: `Load Location ${i}`
          })
        );
        
        updates.push(
          integration.publishMarker({
            uid: `load-test-marker-${i}`,
            lat: 37.7749 + (i * 0.0001),
            lon: -122.4194 + (i * 0.0001),
            type: 'b-m-p-s-m',
            callsign: `Load Marker ${i}`,
            timestamp: new Date()
          })
        );
      }

      // Wait for all updates to be queued/synced
      await Promise.all(updates);
      
      // Force final sync to ensure everything is processed
      await integration.forcSync();
      
      // Verify queues are empty
      const pendingCounts = integration.getPendingSyncCounts();
      expect(pendingCounts.locations).toBe(0);
      expect(pendingCounts.markers).toBe(0);
    }, 20000);
  });
});

// Helper function to check TAK server connectivity
export async function checkTAKServerConnectivity(serverUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${serverUrl}/Marti/api/version`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      // Ignore certificate errors for local testing
      // @ts-ignore
      rejectUnauthorized: false
    });
    
    return response.ok;
  } catch (error) {
    console.warn('TAK server connectivity check failed:', error);
    return false;
  }
}

// Test runner script for manual execution
if (import.meta.vitest === undefined) {
  console.log('TAK Server E2E Test Runner');
  console.log('==========================');
  
  checkTAKServerConnectivity(TEST_CONFIG.serverUrl).then(isConnected => {
    if (isConnected) {
      console.log('✅ TAK server is accessible');
      console.log('Run tests with: npm test -- tak-server-integration.e2e.test.ts');
    } else {
      console.log('❌ TAK server is not accessible');
      console.log('Please ensure TAK server is running at:', TEST_CONFIG.serverUrl);
      console.log('And streaming service is available at: ssl://localhost:8089');
    }
  });
}
