/**
 * TAK Server Integration Demo UI
 * 
 * Lightweight mock UI to exercise TS-1, TS-2, TS-3 flows:
 * - Login with server URL + credentials
 * - Publish location and markers
 * - Display remote teammates and attachments
 * - Show connection status and sync telemetry
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Switch
} from 'react-native';
import { 
  takServerIntegration, 
  TAKServerConfig, 
  ConnectionState, 
  LocationUpdate, 
  MarkerUpdate, 
  RemoteCoT 
} from '../lib/tak-server-integration';

interface DemoState {
  // Login form
  serverUrl: string;
  username: string;
  password: string;
  
  // Connection state
  connectionState: ConnectionState;
  isLoggingIn: boolean;
  
  // Location simulation
  simulateLocation: boolean;
  currentLocation: LocationUpdate | null;
  
  // Markers
  markers: MarkerUpdate[];
  
  // Remote teammates
  remoteTeammates: Map<string, RemoteCoT>;
  
  // Sync status
  pendingSyncCounts: { locations: number; markers: number };
  
  // Logs
  logs: string[];
}

export const TAKServerDemo: React.FC = () => {
  const [state, setState] = useState<DemoState>({
    serverUrl: 'https://localhost:8443',
    username: 'testuser',
    password: 'testpass',
    connectionState: { status: 'disconnected', retryCount: 0 },
    isLoggingIn: false,
    simulateLocation: false,
    currentLocation: null,
    markers: [],
    remoteTeammates: new Map(),
    pendingSyncCounts: { locations: 0, markers: 0 },
    logs: []
  });

  // Add log entry
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setState(prev => ({
      ...prev,
      logs: [`[${timestamp}] ${message}`, ...prev.logs.slice(0, 49)] // Keep last 50 logs
    }));
  }, []);

  // Setup event listeners
  useEffect(() => {
    const integration = takServerIntegration;

    // Connection state changes
    const onConnectionStateChanged = (connectionState: ConnectionState) => {
      setState(prev => ({ ...prev, connectionState }));
      addLog(`Connection state: ${connectionState.status}${connectionState.error ? ` - ${connectionState.error}` : ''}`);
    };

    // Login events
    const onLoginSuccess = () => {
      setState(prev => ({ ...prev, isLoggingIn: false }));
      addLog('Login successful - JWT and certificates obtained');
    };

    const onLoginError = (error: any) => {
      setState(prev => ({ ...prev, isLoggingIn: false }));
      addLog(`Login error: ${error.message || error}`);
      Alert.alert('Login Failed', error.message || 'Unknown error occurred');
    };

    // Streaming events
    const onStreamConnected = () => {
      addLog('Streaming connection established');
    };

    const onStreamError = (error: Error) => {
      addLog(`Streaming error: ${error.message}`);
    };

    // Sync events
    const onLocationSynced = (location: LocationUpdate) => {
      addLog(`Location synced: ${location.callsign || location.uid}`);
      updatePendingSyncCounts();
    };

    const onMarkerSynced = (marker: MarkerUpdate) => {
      addLog(`Marker synced: ${marker.callsign}`);
      updatePendingSyncCounts();
    };

    const onSyncCompleted = (counts: { locationCount: number; markerCount: number }) => {
      addLog(`Sync completed: ${counts.locationCount} locations, ${counts.markerCount} markers`);
    };

    // Remote CoT events
    const onRemoteCoTReceived = (remoteCoT: RemoteCoT) => {
      setState(prev => ({
        ...prev,
        remoteTeammates: new Map(prev.remoteTeammates.set(remoteCoT.uid, remoteCoT))
      }));
      addLog(`Remote CoT received: ${remoteCoT.callsign || remoteCoT.uid} at ${remoteCoT.lat.toFixed(6)}, ${remoteCoT.lon.toFixed(6)}`);
    };

    // Attachment events
    const onAttachmentReceived = (attachment: any) => {
      addLog(`Attachment received: ${attachment.hash}`);
    };

    // Register listeners
    integration.on('connectionStateChanged', onConnectionStateChanged);
    integration.on('loginSuccess', onLoginSuccess);
    integration.on('loginError', onLoginError);
    integration.on('streamConnected', onStreamConnected);
    integration.on('streamError', onStreamError);
    integration.on('locationSynced', onLocationSynced);
    integration.on('markerSynced', onMarkerSynced);
    integration.on('syncCompleted', onSyncCompleted);
    integration.on('remoteCoTReceived', onRemoteCoTReceived);
    integration.on('attachmentReceived', onAttachmentReceived);

    // Initial state
    setState(prev => ({
      ...prev,
      connectionState: integration.getConnectionState(),
      pendingSyncCounts: integration.getPendingSyncCounts()
    }));

    return () => {
      // Cleanup listeners
      integration.removeAllListeners();
    };
  }, [addLog]);

  // Update pending sync counts
  const updatePendingSyncCounts = useCallback(() => {
    setState(prev => ({
      ...prev,
      pendingSyncCounts: takServerIntegration.getPendingSyncCounts()
    }));
  }, []);

  // Location simulation
  useEffect(() => {
    if (!state.simulateLocation) return;

    const interval = setInterval(() => {
      // Simulate movement around a base location (37.7749, -122.4194 - San Francisco)
      const baseLat = 37.7749;
      const baseLon = -122.4194;
      const radius = 0.01; // ~1km radius
      
      const angle = (Date.now() / 10000) % (2 * Math.PI); // Slow circular movement
      const lat = baseLat + Math.cos(angle) * radius;
      const lon = baseLon + Math.sin(angle) * radius;
      
      const location: LocationUpdate = {
        uid: `dtak-${state.username}`,
        lat,
        lon,
        alt: 10 + Math.random() * 5, // 10-15m altitude variation
        course: (angle * 180 / Math.PI) % 360,
        speed: 2.5, // 2.5 m/s walking speed
        timestamp: new Date(),
        callsign: state.username || 'Demo User'
      };

      setState(prev => ({ ...prev, currentLocation: location }));
      takServerIntegration.publishLocation(location);
      updatePendingSyncCounts();
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [state.simulateLocation, state.username, updatePendingSyncCounts]);

  // Handlers
  const handleLogin = async () => {
    if (!state.serverUrl || !state.username || !state.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setState(prev => ({ ...prev, isLoggingIn: true }));
    
    const config: TAKServerConfig = {
      serverUrl: state.serverUrl,
      username: state.username,
      password: state.password
    };

    try {
      await takServerIntegration.login(config);
    } catch (error) {
      // Error handling is done in event listeners
    }
  };

  const handleLogout = async () => {
    setState(prev => ({ ...prev, simulateLocation: false }));
    await takServerIntegration.logout();
    setState(prev => ({
      ...prev,
      currentLocation: null,
      markers: [],
      remoteTeammates: new Map(),
      logs: []
    }));
    addLog('Logged out');
  };

  const handleAddMarker = () => {
    if (!state.currentLocation) {
      Alert.alert('Error', 'No current location available');
      return;
    }

    const marker: MarkerUpdate = {
      uid: `marker-${Date.now()}`,
      lat: state.currentLocation.lat + (Math.random() - 0.5) * 0.001, // Nearby location
      lon: state.currentLocation.lon + (Math.random() - 0.5) * 0.001,
      alt: state.currentLocation.alt,
      type: 'b-m-p-s-m', // Marker point
      callsign: `Marker ${state.markers.length + 1}`,
      remarks: `Demo marker created at ${new Date().toLocaleTimeString()}`,
      timestamp: new Date()
    };

    setState(prev => ({
      ...prev,
      markers: [...prev.markers, marker]
    }));

    takServerIntegration.publishMarker(marker);
    updatePendingSyncCounts();
    addLog(`Marker added: ${marker.callsign}`);
  };

  const handleForceSync = async () => {
    try {
      await takServerIntegration.forcSync();
      addLog('Force sync completed');
    } catch (error) {
      addLog(`Force sync error: ${error}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return '#4CAF50';
      case 'connecting': return '#FF9800';
      case 'error': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>dTAK Server Integration Demo</Text>
      
      {/* Connection Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connection Status</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(state.connectionState.status) }]} />
          <Text style={styles.statusText}>
            {state.connectionState.status.toUpperCase()}
            {state.connectionState.retryCount > 0 && ` (Retry ${state.connectionState.retryCount})`}
          </Text>
        </View>
        {state.connectionState.error && (
          <Text style={styles.errorText}>{state.connectionState.error}</Text>
        )}
        {state.connectionState.lastConnected && (
          <Text style={styles.infoText}>
            Last connected: {state.connectionState.lastConnected.toLocaleString()}
          </Text>
        )}
      </View>

      {/* Login Form */}
      {state.connectionState.status === 'disconnected' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TAK Server Login</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Server URL (e.g., https://localhost:8443)"
            value={state.serverUrl}
            onChangeText={(text) => setState(prev => ({ ...prev, serverUrl: text }))}
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={state.username}
            onChangeText={(text) => setState(prev => ({ ...prev, username: text }))}
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={state.password}
            onChangeText={(text) => setState(prev => ({ ...prev, password: text }))}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]} 
            onPress={handleLogin}
            disabled={state.isLoggingIn}
          >
            {state.isLoggingIn ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Connected Controls */}
      {state.connectionState.status === 'connected' && (
        <>
          {/* Location Simulation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location Simulation</Text>
            
            <View style={styles.switchRow}>
              <Text>Simulate Movement</Text>
              <Switch
                value={state.simulateLocation}
                onValueChange={(value) => setState(prev => ({ ...prev, simulateLocation: value }))}
              />
            </View>
            
            {state.currentLocation && (
              <View style={styles.locationInfo}>
                <Text style={styles.infoText}>
                  Current: {state.currentLocation.lat.toFixed(6)}, {state.currentLocation.lon.toFixed(6)}
                </Text>
                <Text style={styles.infoText}>
                  Alt: {state.currentLocation.alt?.toFixed(1)}m, 
                  Course: {state.currentLocation.course?.toFixed(0)}°, 
                  Speed: {state.currentLocation.speed?.toFixed(1)}m/s
                </Text>
              </View>
            )}
          </View>

          {/* Markers */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Markers ({state.markers.length})</Text>
            
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]} 
              onPress={handleAddMarker}
              disabled={!state.currentLocation}
            >
              <Text style={styles.buttonText}>Add Marker</Text>
            </TouchableOpacity>
            
            {state.markers.slice(-3).map((marker, index) => (
              <View key={marker.uid} style={styles.markerItem}>
                <Text style={styles.markerText}>
                  {marker.callsign} - {marker.lat.toFixed(6)}, {marker.lon.toFixed(6)}
                </Text>
                <Text style={styles.infoText}>{marker.remarks}</Text>
              </View>
            ))}
          </View>

          {/* Remote Teammates */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Remote Teammates ({state.remoteTeammates.size})</Text>
            
            {Array.from(state.remoteTeammates.values()).slice(0, 5).map((teammate) => (
              <View key={teammate.uid} style={styles.teammateItem}>
                <Text style={styles.teammateText}>
                  {teammate.callsign || teammate.uid}
                </Text>
                <Text style={styles.infoText}>
                  {teammate.lat.toFixed(6)}, {teammate.lon.toFixed(6)}
                </Text>
                <Text style={styles.infoText}>
                  {teammate.timestamp.toLocaleTimeString()}
                  {teammate.attachments && ` (${teammate.attachments.length} attachments)`}
                </Text>
              </View>
            ))}
            
            {state.remoteTeammates.size === 0 && (
              <Text style={styles.infoText}>No remote teammates detected</Text>
            )}
          </View>

          {/* Sync Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sync Status</Text>
            
            <Text style={styles.infoText}>
              Pending: {state.pendingSyncCounts.locations} locations, {state.pendingSyncCounts.markers} markers
            </Text>
            
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]} 
              onPress={handleForceSync}
            >
              <Text style={styles.buttonText}>Force Sync</Text>
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <View style={styles.section}>
            <TouchableOpacity 
              style={[styles.button, styles.dangerButton]} 
              onPress={handleLogout}
            >
              <Text style={styles.buttonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Event Log */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Event Log</Text>
        <ScrollView style={styles.logContainer} nestedScrollEnabled>
          {state.logs.map((log, index) => (
            <Text key={index} style={styles.logText}>{log}</Text>
          ))}
          {state.logs.length === 0 && (
            <Text style={styles.infoText}>No events yet</Text>
          )}
        </ScrollView>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    marginTop: 4,
  },
  infoText: {
    color: '#666',
    fontSize: 14,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: '#4CAF50',
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  markerItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  markerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  teammateItem: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  teammateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1976d2',
  },
  logContainer: {
    maxHeight: 200,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 8,
  },
  logText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
    marginBottom: 2,
  },
});

export default TAKServerDemo;
