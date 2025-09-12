import { CoTParser } from '../index.js';

const basicFeature = {
    "id": "123",
    "type": "Feature" as const,
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
        "type": "Point" as const,
        "coordinates": [1.1, 2.2, 0]
    }
};

describe('COT Basic Functionality', () => {
    test('COT.callsign', async () => {
        const cot = await CoTParser.from_geojson(basicFeature);

        expect(cot.callsign()).toBe('BasicTest');
        expect(cot.callsign('Reassign')).toBe('Reassign');
        expect(cot.callsign()).toBe('Reassign');
    });

    test('COT.type', async () => {
        const cot = await CoTParser.from_geojson(basicFeature);

        expect(cot.type()).toBe('a-f-G');
        expect(cot.type('u-d-f')).toBe('u-d-f');
        expect(cot.type()).toBe('u-d-f');
    });

    test('COT.archived', async () => {
        const cot = await CoTParser.from_geojson(basicFeature);

        expect(cot.archived()).toBe(false);
        expect(cot.archived(true)).toBe(true);

        const geoJsonWithArchived = await CoTParser.to_geojson(cot);
        expect(geoJsonWithArchived.properties.archived).toBe(true);

        expect(cot.archived()).toBe(true);
        expect(cot.archived(false)).toBe(false);
        expect(cot.archived()).toBe(false);

        const geoJsonWithoutArchived = await CoTParser.to_geojson(cot);
        expect(geoJsonWithoutArchived.properties.archived).toBeUndefined();
    });
});

