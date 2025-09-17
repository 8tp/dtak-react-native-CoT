import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Button,
  Alert,
} from 'react-native';

import { CoTParser } from '@tak-ps/react-native-cot';

const App: React.FC = () => {
  const [cotMessage, setCotMessage] = useState<string>('');
  const [geoJsonFeature, setGeoJsonFeature] = useState<any>(null);

  const createSampleCoT = async () => {
    try {
      // Create a sample GeoJSON feature
      const sampleFeature = {
        type: 'Feature',
        id: 'sample-unit-001',
        properties: {
          callsign: 'Alpha Team',
          type: 'a-f-G-E-V',
          how: 'm-g',
          time: new Date().toISOString(),
          start: new Date().toISOString(),
          stale: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
          metadata: {
            mission: 'Training Exercise',
            unit: 'Alpha Company'
          }
        },
        geometry: {
          type: 'Point',
          coordinates: [-122.4194, 37.7749, 0] // San Francisco
        }
      };

      // Convert GeoJSON to CoT
      const cot = await CoTParser.from_geojson(sampleFeature);
      const cotXml = cot.to_xml();
      setCotMessage(cotXml);

      // Convert back to GeoJSON to demonstrate round-trip
      const backToGeoJson = await CoTParser.to_geojson(cot);
      setGeoJsonFeature(backToGeoJson);

      Alert.alert('Success', 'CoT message created successfully!');
    } catch (error) {
      Alert.alert('Error', `Failed to create CoT: ${error}`);
    }
  };

  const testProtobufConversion = async () => {
    try {
      if (!geoJsonFeature) {
        Alert.alert('Error', 'Please create a CoT message first');
        return;
      }

      // Test protobuf round-trip conversion
      const cot = await CoTParser.from_geojson(geoJsonFeature);
      const protobuf = await CoTParser.to_proto(cot);
      const cotFromProto = await CoTParser.from_proto(protobuf);
      const finalGeoJson = await CoTParser.to_geojson(cotFromProto);

      Alert.alert('Success', 'Protobuf round-trip conversion completed!');
      console.log('Original:', geoJsonFeature);
      console.log('After protobuf round-trip:', finalGeoJson);
    } catch (error) {
      Alert.alert('Error', `Protobuf conversion failed: ${error}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>dTAK React Native CoT Library</Text>
          <Text style={styles.subtitle}>Tactical Awareness Kit Demo</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CoT Message Operations</Text>
          
          <Button
            title="Create Sample CoT Message"
            onPress={createSampleCoT}
            color="#007AFF"
          />
          
          {cotMessage ? (
            <View style={styles.messageContainer}>
              <Text style={styles.messageTitle}>Generated CoT XML:</Text>
              <ScrollView style={styles.xmlContainer} horizontal>
                <Text style={styles.xmlText}>{cotMessage}</Text>
              </ScrollView>
            </View>
          ) : null}

          {geoJsonFeature ? (
            <View style={styles.messageContainer}>
              <Text style={styles.messageTitle}>GeoJSON Feature:</Text>
              <ScrollView style={styles.jsonContainer}>
                <Text style={styles.jsonText}>
                  {JSON.stringify(geoJsonFeature, null, 2)}
                </Text>
              </ScrollView>
              
              <Button
                title="Test Protobuf Conversion"
                onPress={testProtobufConversion}
                color="#34C759"
              />
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Library Features</Text>
          <Text style={styles.featureText}>✓ Offline-first tactical mapping</Text>
          <Text style={styles.featureText}>✓ CoT message parsing and generation</Text>
          <Text style={styles.featureText}>✓ Protobuf serialization support</Text>
          <Text style={styles.featureText}>✓ GeoJSON conversion</Text>
          <Text style={styles.featureText}>✓ React Native file system integration</Text>
          <Text style={styles.featureText}>✓ Mesh networking ready</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2c3e50',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#bdc3c7',
    textAlign: 'center',
    marginTop: 5,
  },
  section: {
    margin: 20,
    padding: 15,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2c3e50',
  },
  messageContainer: {
    marginTop: 15,
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#34495e',
  },
  xmlContainer: {
    backgroundColor: '#ecf0f1',
    padding: 10,
    borderRadius: 5,
    maxHeight: 150,
  },
  xmlText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#2c3e50',
  },
  jsonContainer: {
    backgroundColor: '#ecf0f1',
    padding: 10,
    borderRadius: 5,
    maxHeight: 200,
    marginBottom: 15,
  },
  jsonText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#2c3e50',
  },
  featureText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#27ae60',
  },
});

export default App;
