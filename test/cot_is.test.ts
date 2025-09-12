import { describe, test, expect } from 'vitest';
import { CoTParser } from '../index.js';

describe('CoT Classification Tests', () => {
    test('CoT.is_friend', async () => {
        let cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-B'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_friend()).toBe(true);

        cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-h-B'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_friend()).toBe(false);
    });

    test('CoT.is_hostile', async () => {
        let cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-h-B'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_hostile()).toBe(true);

        cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-B'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_hostile()).toBe(false);
    });

    test('CoT.is_unknown', async () => {
        let cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-u-B'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_unknown()).toBe(true);

        cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-B'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_unknown()).toBe(false);
    });

    test('CoT.is_pending', async () => {
        let cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-p-B'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_pending()).toBe(true);

        cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-B'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_pending()).toBe(false);
    });

    test('CoT.is_assumed', async () => {
        let cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-a-B'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_assumed()).toBe(true);

        cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-B'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_assumed()).toBe(false);
    });

    test('CoT.is_neutral', async () => {
        let cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-n-B'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_neutral()).toBe(true);

        cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-B'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_neutral()).toBe(false);
    });

    test('CoT.is_suspect', async () => {
        let cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-s-B'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_suspect()).toBe(true);

        cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-B'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_suspect()).toBe(false);
    });

    test('CoT.is_joker', async () => {
        let cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-j-B'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_joker()).toBe(true);

        cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-B'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_joker()).toBe(false);
    });

    test('CoT.is_faker', async () => {
        let cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-k-B'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_faker()).toBe(true);

        cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-B'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_faker()).toBe(false);
    });

    test('CoT.is_atom', async () => {
        let cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-A'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_atom()).toBe(true);

        cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-B'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_atom()).toBe(false);
    });

    test('CoT.is_airborne', async () => {
        let cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-A'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_airborne()).toBe(true);

        cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-B'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_airborne()).toBe(false);
    });

    test('CoT.is_ground', async () => {
        let cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-B'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_ground()).toBe(true);

        cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-A'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_ground()).toBe(false);
    });

    test('CoT.is_installation', async () => {
        let cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-B-I-B'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_installation()).toBe(true);

        cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-B-E-V'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_installation()).toBe(false);

        cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-B-I'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_installation()).toBe(true);
    });

    test('CoT.is_vehicle', async () => {
        let cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-B-E-V'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_vehicle()).toBe(true);

        cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-B-I-B'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_vehicle()).toBe(false);

        cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-B-E'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_vehicle()).toBe(true);
    });

    test('CoT.is_equipment', async () => {
        let cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-B-E'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_equipment()).toBe(true);

        cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-B-I'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_equipment()).toBe(false);
    });

    test('CoT.is_surface', async () => {
        let cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-S'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_surface()).toBe(true);

        cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-B'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_surface()).toBe(false);
    });

    test('CoT.is_subsurface', async () => {
        let cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-U'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_subsurface()).toBe(true);

        cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-B'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_subsurface()).toBe(false);
    });

    test('CoT.is_uav', async () => {
        let cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-A-M-F-Q'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_uav()).toBe(true);

        cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                type: 'a-f-A-M-F'
            },
            geometry: { type: 'Point', coordinates: [0,0] }
        });

        expect(cot.is_uav()).toBe(false);
    });
});
