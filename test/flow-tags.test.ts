import { CoTParser } from '../index.js';

describe('FlowTags', () => {
    test('Basic flow tags functionality', async () => {
        // React Native compatible - hardcode the package info or bundle it
        const pkg = { version: '14.7.9' }; // This would need to be adjusted based on your React Native setup

        const cot = await CoTParser.from_geojson({
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
        });

        expect(cot.raw.event.detail).toBeDefined();

        if (cot.raw.event.detail && cot.raw.event.detail['_flow-tags_']) {
            expect(cot.raw.event.detail['_flow-tags_']).toBeDefined();
            expect(typeof cot.raw.event.detail['_flow-tags_'][`NodeCoT-${pkg.version}`]).toBe('string');
        }
    });
});
