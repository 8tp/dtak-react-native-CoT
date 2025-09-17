/**
 * Simplified TAK Server Integration Tests
 * 
 * Basic tests for TAK Server integration functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TAKServerIntegration, type TAKServerConfig, type LocationUpdate, type MarkerUpdate } from '../lib/tak-server-integration';

// Mock all external dependencies
vi.mock('../../react-tak/index.native.js', () => ({
  default: class MockTAK {
    static connect = vi.fn();
    on = vi.fn();
    write = vi.fn();
    destroy = vi.fn();
  },
  TAK: class MockTAK {
    static connect = vi.fn();
    on = vi.fn();
    write = vi.fn();
    destroy = vi.fn();
  },
  TAKAPI: vi.fn().mockImplementation(() => ({
    auth: {
      init: vi.fn(),
      jwt: 'mock-jwt'
    },
    url: new URL('https://localhost:8443')
  })),
  CoT: vi.fn().mockImplementation((data) => ({ raw: data }))
}));

vi.mock('../../react-tak/lib/auth.js', () => ({
  APIAuthPassword: vi.fn().mockImplementation((username, password) => ({
    username,
    password,
    jwt: 'mock-jwt',
    init: vi.fn(),
    fetch: vi.fn()
  }))
}));

vi.mock('../../react-tak/lib/api/credentials.js', () => ({
  default: vi.fn().mockImplementation(() => ({
    generate: vi.fn().mockResolvedValue({
      cert: 'mock-cert',
      key: 'mock-key',
      ca: ['mock-ca']
    })
  }))
}));

vi.mock('../../react-tak/lib/api/files.js', () => ({
  default: vi.fn().mockImplementation(() => ({
    meta: vi.fn(),
    download: vi.fn()
  }))
}));

vi.mock('../../react-tak/lib/platform.js', () => ({
  isReactNative: false
}));

describe('TAKServerIntegration - Basic Functionality', () => {
  let integration: TAKServerIntegration;

  beforeEach(() => {
    vi.clearAllMocks();
    integration = new TAKServerIntegration();
  });

  describe('Initialization', () => {
    it('should create TAKServerIntegration instance', () => {
      expect(integration).toBeInstanceOf(TAKServerIntegration);
    });

    it('should have initial disconnected state', () => {
      const state = integration.getConnectionState();
      expect(state.status).toBe('disconnected');
      expect(state.retryCount).toBe(0);
    });

    it('should have empty pending sync counts initially', () => {
      const counts = integration.getPendingSyncCounts();
      expect(counts.locations).toBe(0);
      expect(counts.markers).toBe(0);
    });
  });

  describe('Location Publishing', () => {
    it('should queue location updates when offline', async () => {
      const location: LocationUpdate = {
        uid: 'test-location-1',
        lat: 38.9072,
        lon: -77.0369,
        alt: 100,
        course: 45,
        speed: 10,
        timestamp: new Date(),
        callsign: 'Test Unit'
      };

      await integration.publishLocation(location);
      
      const counts = integration.getPendingSyncCounts();
      expect(counts.locations).toBe(1);
    });

    it('should deduplicate location updates by UID', async () => {
      const location1: LocationUpdate = {
        uid: 'test-location-1',
        lat: 38.9072,
        lon: -77.0369,
        timestamp: new Date(),
      };

      const location2: LocationUpdate = {
        uid: 'test-location-1',
        lat: 38.9073,
        lon: -77.0370,
        timestamp: new Date(),
      };

      await integration.publishLocation(location1);
      await integration.publishLocation(location2);
      
      const counts = integration.getPendingSyncCounts();
      expect(counts.locations).toBe(1); // Should only have the latest update
    });
  });

  describe('Marker Publishing', () => {
    it('should queue marker updates when offline', async () => {
      const marker: MarkerUpdate = {
        uid: 'test-marker-1',
        lat: 38.9072,
        lon: -77.0369,
        type: 'a-n-G',
        callsign: 'Test Marker',
        remarks: 'Test marker for unit testing',
        timestamp: new Date()
      };

      await integration.publishMarker(marker);
      
      const counts = integration.getPendingSyncCounts();
      expect(counts.markers).toBe(1);
    });

    it('should deduplicate marker updates by UID', async () => {
      const marker1: MarkerUpdate = {
        uid: 'test-marker-1',
        lat: 38.9072,
        lon: -77.0369,
        type: 'a-n-G',
        callsign: 'Test Marker',
        timestamp: new Date()
      };

      const marker2: MarkerUpdate = {
        uid: 'test-marker-1',
        lat: 38.9073,
        lon: -77.0370,
        type: 'a-n-G',
        callsign: 'Updated Marker',
        timestamp: new Date()
      };

      await integration.publishMarker(marker1);
      await integration.publishMarker(marker2);
      
      const counts = integration.getPendingSyncCounts();
      expect(counts.markers).toBe(1); // Should only have the latest update
    });
  });

  describe('Event Emission', () => {
    it('should emit events for location queuing', async () => {
      const eventSpy = vi.fn();
      integration.on('locationQueued', eventSpy);

      const location: LocationUpdate = {
        uid: 'test-location-1',
        lat: 38.9072,
        lon: -77.0369,
        timestamp: new Date()
      };

      await integration.publishLocation(location);
      
      expect(eventSpy).toHaveBeenCalledWith(location);
    });

    it('should emit events for marker queuing', async () => {
      const eventSpy = vi.fn();
      integration.on('markerQueued', eventSpy);

      const marker: MarkerUpdate = {
        uid: 'test-marker-1',
        lat: 38.9072,
        lon: -77.0369,
        type: 'a-n-G',
        callsign: 'Test Marker',
        timestamp: new Date()
      };

      await integration.publishMarker(marker);
      
      expect(eventSpy).toHaveBeenCalledWith(marker);
    });

    it('should emit connection state changes', () => {
      const eventSpy = vi.fn();
      integration.on('connectionStateChanged', eventSpy);

      // Trigger a state change by accessing private method via type assertion
      (integration as unknown as { updateConnectionState: (status: string) => void }).updateConnectionState('connecting');
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'connecting'
        })
      );
    });
  });

  describe('Logout', () => {
    it('should clear state on logout', async () => {
      // Add some pending updates
      const location: LocationUpdate = {
        uid: 'test-location-1',
        lat: 38.9072,
        lon: -77.0369,
        timestamp: new Date()
      };

      await integration.publishLocation(location);
      
      // Verify we have pending updates
      expect(integration.getPendingSyncCounts().locations).toBe(1);
      
      // Logout
      await integration.logout();
      
      // Verify state is cleared
      const state = integration.getConnectionState();
      expect(state.status).toBe('disconnected');
      
      const counts = integration.getPendingSyncCounts();
      expect(counts.locations).toBe(0);
      expect(counts.markers).toBe(0);
    });
  });
});
