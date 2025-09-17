import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import MapView, { Callout, Marker, Polygon, Polyline } from 'react-native-maps';
import { CoTParser } from '@tak-ps/react-native-cot';

const SAMPLE_COT_MESSAGES = [
  {
    id: 'patrol-alpha',
    summary: 'Mounted patrol staged near downtown.',
    xml: `<event version="2.0" uid="patrol-alpha" type="a-f-G-U-C" how="m-g" time="2024-07-10T16:49:54.000Z" start="2024-07-10T16:49:54.000Z" stale="2024-07-10T17:04:54.000Z"><point lat="39.742043" lon="-104.991531" hae="0" ce="9999999" le="9999999"/><detail><contact callsign="Patrol Alpha"/><remarks></remarks></detail></event>`
  },
  {
    id: 'route-denver',
    summary: 'Preferred supply ingress headed east.',
    xml: `<event version="2.0" uid="route-denver" type="u-d-f" how="m-g" time="2024-07-10T16:49:54.000Z" start="2024-07-10T16:49:54.000Z" stale="2024-07-10T16:49:54.000Z"><point lat="39.739" lon="-105" hae="0" ce="9999999" le="9999999"/><detail><contact callsign="Supply Route"/><remarks></remarks><strokeColor value="-855668736"/><strokeWeight value="3"/><strokeStyle value="solid"/><link point="39.719,-105.02"/><link point="39.739,-105"/><link point="39.749,-104.98"/><link point="39.761,-104.96"/><labels_on value="false"/><tog enabled="0"/></detail></event>`
  },
  {
    id: 'evac-zone',
    summary: 'Temporary evacuation perimeter.',
    xml: `<event version="2.0" uid="evac-zone" type="u-d-f" how="m-g" time="2024-07-10T16:49:54.000Z" start="2024-07-10T16:49:54.000Z" stale="2024-07-10T16:49:54.000Z"><point lat="39.745000000000005" lon="-104.995" hae="0" ce="9999999" le="9999999"/><detail><contact callsign="Evac Zone"/><remarks></remarks><strokeColor value="-1711319808"/><strokeWeight value="2"/><strokeStyle value="solid"/><link point="39.735,-105.005"/><link point="39.735,-104.985"/><link point="39.755,-104.985"/><link point="39.755,-105.005"/><link point="39.735,-105.005"/><fillColor value="1291823616"/><labels_on value="false"/><tog enabled="0"/></detail></event>`
  }
];

type MapFeature = Awaited<ReturnType<typeof CoTParser.to_geojson>>;

type FeatureRecord = {
  id: string;
  summary: string;
  xml: string;
  feature: MapFeature;
};

type Coordinate = {
  latitude: number;
  longitude: number;
};

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

function extractCoordinates(feature: MapFeature): Coordinate[] {
  const { geometry } = feature;

  if (geometry.type === 'Point') {
    const [lon, lat] = geometry.coordinates;
    return [{ latitude: lat, longitude: lon }];
  }

  if (geometry.type === 'LineString') {
    return geometry.coordinates.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
  }

  if (geometry.type === 'Polygon') {
    return geometry.coordinates.flatMap((ring) =>
      ring.map(([lon, lat]) => ({ latitude: lat, longitude: lon }))
    );
  }

  return [];
}

function computeRegion(features: FeatureRecord[]): Region | undefined {
  if (!features.length) return undefined;

  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLon = Number.POSITIVE_INFINITY;
  let maxLon = Number.NEGATIVE_INFINITY;

  for (const record of features) {
    for (const coord of extractCoordinates(record.feature)) {
      minLat = Math.min(minLat, coord.latitude);
      maxLat = Math.max(maxLat, coord.latitude);
      minLon = Math.min(minLon, coord.longitude);
      maxLon = Math.max(maxLon, coord.longitude);
    }
  }

  if (!isFinite(minLat) || !isFinite(minLon)) return undefined;

  const latitude = (minLat + maxLat) / 2;
  const longitude = (minLon + maxLon) / 2;
  const latitudeDelta = Math.max((maxLat - minLat) * 1.4, 0.05);
  const longitudeDelta = Math.max((maxLon - minLon) * 1.4, 0.05);

  return { latitude, longitude, latitudeDelta, longitudeDelta };
}

function buildStrokeColor(feature: MapFeature, fallback: string): string {
  const propColor = feature.properties?.stroke;
  return typeof propColor === 'string' ? propColor : fallback;
}

function buildFillColor(feature: MapFeature, fallback: string): string {
  const propColor = feature.properties?.fill;
  return typeof propColor === 'string' ? propColor : fallback;
}

export default function App(): JSX.Element {
  const [records, setRecords] = useState<FeatureRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const parsed = await Promise.all(
        SAMPLE_COT_MESSAGES.map(async (entry) => {
          const cot = CoTParser.from_xml(entry.xml);
          const feature = await CoTParser.to_geojson(cot);
          return { ...entry, feature } satisfies FeatureRecord;
        })
      );

      if (!cancelled) {
        setRecords(parsed);
        setActiveId(parsed[0]?.id ?? null);
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const region = useMemo(() => computeRegion(records), [records]);

  const focusFeature = useCallback((record: FeatureRecord) => {
    setActiveId(record.id);
    const coords = extractCoordinates(record.feature);
    if (!coords.length || !mapRef.current) return;

    if (coords.length === 1) {
      const target = coords[0];
      mapRef.current.animateToRegion({
        latitude: target.latitude,
        longitude: target.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      });
    } else {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 80, bottom: 200, left: 80 },
        animated: true
      });
    }
  }, []);

  return (
    <View style={styles.container}>
      {region ? (
        <MapView ref={mapRef} style={styles.map} initialRegion={region}>
          {records.map((record) => {
            const coords = extractCoordinates(record.feature);
            const callsign = String(record.feature.properties?.callsign ?? record.id);
            const stroke = buildStrokeColor(record.feature, '#FF8800');

            if (record.feature.geometry.type === 'Point') {
              const coordinate = coords[0];
              return (
                <Marker key={record.id} coordinate={coordinate} pinColor={stroke} onPress={() => focusFeature(record)}>
                  <Callout>
                    <View style={styles.callout}>
                      <Text style={styles.calloutTitle}>{callsign}</Text>
                      <Text style={styles.calloutSubtitle}>{record.summary}</Text>
                    </View>
                  </Callout>
                </Marker>
              );
            }

            if (record.feature.geometry.type === 'LineString') {
              return (
                <Polyline
                  key={record.id}
                  coordinates={coords}
                  strokeColor={stroke}
                  strokeWidth={record.id === activeId ? 6 : 4}
                  tappable
                  onPress={() => focusFeature(record)}
                />
              );
            }

            if (record.feature.geometry.type === 'Polygon') {
              return (
                <Polygon
                  key={record.id}
                  coordinates={coords}
                  strokeColor={stroke}
                  strokeWidth={record.id === activeId ? 4 : 2}
                  fillColor={buildFillColor(record.feature, 'rgba(255, 136, 0, 0.25)')}
                  tappable
                  onPress={() => focusFeature(record)}
                />
              );
            }

            return null;
          })}
        </MapView>
      ) : (
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading CoT overlays…</Text>
        </View>
      )}

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>CoT Feeds</Text>
        <ScrollView contentContainerStyle={styles.legendItems} horizontal showsHorizontalScrollIndicator={false}>
          {records.map((record) => {
            const callsign = String(record.feature.properties?.callsign ?? record.id);
            const isActive = record.id === activeId;
            return (
              <Pressable
                key={record.id}
                style={[styles.legendItem, isActive && styles.legendItemActive]}
                onPress={() => focusFeature(record)}
              >
                <Text style={styles.legendItemTitle}>{callsign}</Text>
                <Text style={styles.legendItemSubtitle}>{record.summary}</Text>
                <Text style={styles.legendItemMeta}>{record.feature.properties?.type ?? 'Unknown type'}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  map: {
    flex: 1
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    color: '#e2e8f0',
    fontSize: 16
  },
  callout: {
    maxWidth: 200
  },
  calloutTitle: {
    fontWeight: '600',
    marginBottom: 4
  },
  calloutSubtitle: {
    color: '#4b5563'
  },
  legend: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingVertical: 16,
    paddingHorizontal: 12
  },
  legendTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12
  },
  legendItems: {
    gap: 12
  },
  legendItem: {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderRadius: 12,
    padding: 14,
    width: 220
  },
  legendItemActive: {
    borderColor: '#f97316',
    borderWidth: 2
  },
  legendItemTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  legendItemSubtitle: {
    color: '#cbd5f5',
    marginBottom: 6
  },
  legendItemMeta: {
    color: '#94a3b8',
    fontSize: 12
  }
});
