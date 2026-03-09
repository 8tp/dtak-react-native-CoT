import type { Static } from '@sinclair/typebox';
import type { Feature } from '../lib/types/feature.js';
import { CoTParser } from '../index.js';

// Mock fixture data for testing - in a real React Native app, these would be bundled
const mockFixtures: Record<string, Static<typeof Feature>> = {
    'basic.geojson': {
        "id": "123",
        "type": "Feature",
        "path": "/",
        "properties": {
            "type": "a-f-G",
            "how": "m-g",
            "callsign": "BasicTest",
            "center": [1.1, 2.2, 0],
            "time": "2023-08-04T15:17:43.649Z",
            "start": "2023-08-04T15:17:43.649Z",
            "stale": "2023-08-04T15:17:43.649Z",
            "metadata": {}
        },
        "geometry": {
            "type": "Point",
            "coordinates": [1.1, 2.2, 0]
        }
    }
};

describe('GeoJSON Reversal Tests', () => {
    Object.entries(mockFixtures).forEach(([fixtureName, fixture]) => {
        test(`GeoJSON Reversal: ${fixtureName}`, async () => {
            const geo = await CoTParser.from_geojson(fixture);
            const output = await CoTParser.to_geojson(geo);

            expect(output).toEqual(fixture);
        });
    });
});
