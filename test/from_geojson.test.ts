import { describe, test, expect } from 'vitest';
import { CoTParser } from '../index.js';

describe('CoTParser.from_geojson', () => {
    test('Point', async () => {
        const geo = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'Point',
                coordinates: [1.1, 2.2]
            }
        });

        expect(geo.raw.event._attributes.version).toBe('2.0');
        expect(geo.raw.event._attributes.type).toBe('a-f-G');
        expect(geo.raw.event._attributes.how).toBe('m-g');
        expect(geo.raw.event._attributes.uid.length).toBe(36);
        expect(geo.raw.event._attributes.time.length).toBe(24);
        expect(geo.raw.event._attributes.start.length).toBe(24);
        expect(geo.raw.event._attributes.stale.length).toBe(24);

        expect(geo.raw.event.point).toEqual({
            _attributes: { lat: 2.2, lon: 1.1, hae: 0.0, ce: 9999999.0, le: 9999999.0 }
        });

        if (!geo.raw.event.detail || !geo.raw.event.detail.remarks) {
            throw new Error('No Detail Section');
        } else {
            expect(geo.raw.event.detail['_flow-tags_']).toBeDefined();
            delete geo.raw.event.detail['_flow-tags_'];

            expect(geo.raw.event.detail).toEqual({
                contact: { _attributes: { callsign: 'UNKNOWN' } },
                remarks: { _attributes: {}, _text: '' }
            });
        }
    });

    test('Polygon', async () => {
        const geo = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [-108.587, 39.098],
                    [-108.587, 39.032],
                    [-108.505, 39.032],
                    [-108.505, 39.098],
                    [-108.587, 39.098]
                ]]
            }
        });

        expect(geo.raw.event._attributes.version).toBe('2.0');
        expect(geo.raw.event._attributes.type).toBe('u-d-f');
        expect(geo.raw.event._attributes.how).toBe('m-g');
        expect(geo.raw.event._attributes.uid.length).toBe(36);
        expect(geo.raw.event._attributes.time.length).toBe(24);
        expect(geo.raw.event._attributes.start.length).toBe(24);
        expect(geo.raw.event._attributes.stale.length).toBe(24);

        expect(geo.raw.event.point).toEqual({
            _attributes: { lat: 39.065, lon: -108.54599999999999, hae: 0.0, ce: 9999999.0, le: 9999999.0 }
        });

        if (!geo.raw.event.detail || !geo.raw.event.detail.remarks) {
            throw new Error('No Detail Section');
        } else {
            expect(geo.raw.event.detail['_flow-tags_']).toBeDefined();
            delete geo.raw.event.detail['_flow-tags_'];

            expect(geo.raw.event.detail).toEqual({
                contact: { _attributes: { callsign: 'UNKNOWN' } },
                link: [
                    { _attributes: { point: '39.098,-108.587' } },
                    { _attributes: { point: '39.032,-108.587' } },
                    { _attributes: { point: '39.032,-108.505' } },
                    { _attributes: { point: '39.098,-108.505' } },
                    { _attributes: { point: '39.098,-108.587' } },
                ],
                labels_on: { _attributes: { value: false } },
                tog: { _attributes: { enabled: '0' } },
                strokeColor: { _attributes: { value: -2130706688 } },
                strokeWeight: { _attributes: { value: 3 } },
                strokeStyle: { _attributes: { value: 'solid' } },
                fillColor: { _attributes: { value: -2130706688 } },
                remarks: { _attributes: {}, _text: '' }
            });
        }
    });

    test('LineString', async () => {
        const geo = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: [
                    [-108.587, 39.098],
                    [-108.587, 39.032],
                    [-108.505, 39.032],
                    [-108.505, 39.098],
                    [-108.587, 39.098]
                ]
            }
        });

        expect(geo.raw.event._attributes.version).toBe('2.0');
        expect(geo.raw.event._attributes.type).toBe('u-d-f');
        expect(geo.raw.event._attributes.how).toBe('m-g');
        expect(geo.raw.event._attributes.uid.length).toBe(36);
        expect(geo.raw.event._attributes.time.length).toBe(24);
        expect(geo.raw.event._attributes.start.length).toBe(24);
        expect(geo.raw.event._attributes.stale.length).toBe(24);

        expect(geo.raw.event.point).toEqual({
            _attributes: { lat: 39.098, lon: -108.505, hae: 0.0, ce: 9999999.0, le: 9999999.0 }
        });

        if (!geo.raw.event.detail || !geo.raw.event.detail.remarks) {
            throw new Error('No Detail Section');
        } else {
            expect(geo.raw.event.detail['_flow-tags_']).toBeDefined();
            delete geo.raw.event.detail['_flow-tags_'];

            expect(geo.raw.event.detail).toEqual({
                contact: { _attributes: { callsign: 'UNKNOWN' } },
                link: [
                    { _attributes: { point: '39.098,-108.587' } },
                    { _attributes: { point: '39.032,-108.587' } },
                    { _attributes: { point: '39.032,-108.505' } },
                    { _attributes: { point: '39.098,-108.505' } },
                    { _attributes: { point: '39.098,-108.587' } }
                ],
                labels_on: { _attributes: { value: false } },
                tog: { _attributes: { enabled: '0' } },
                strokeColor: { _attributes: { value: -2130706688 } },
                strokeWeight: { _attributes: { value: 3 } },
                strokeStyle: { _attributes: { value: 'solid' } },
                remarks: { _attributes: {}, _text: '' }
            });
        }
    });

    test('Start', async () => {
        const geo = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                // 1hr in the future
                start: new Date(+new Date() + 60 * 60 * 1000).toISOString()
            },
            geometry: {
                type: 'Point',
                coordinates: [1.1, 2.2]
            }
        });

        // Approx +/- 100ms + 1hr ahead of Now
        expect(+new Date(geo.raw.event._attributes.start) > +new Date() + 60 * 60 * 1000 - 100).toBe(true);
        expect(+new Date(geo.raw.event._attributes.start) < +new Date() + 60 * 60 * 1000 + 100).toBe(true);

        // Approx +/- 100ms ahead of Now
        expect(+new Date(geo.raw.event._attributes.time) > +new Date() - 100).toBe(true);
        expect(+new Date(geo.raw.event._attributes.time) < +new Date() + 100).toBe(true);

        // Approx +/- 100ms +1hr20s ahead of now
        expect(+new Date(geo.raw.event._attributes.stale) > +new Date(geo.raw.event._attributes.time) - 100 + 20 * 1000).toBe(true);
        expect(+new Date(geo.raw.event._attributes.stale) < +new Date(geo.raw.event._attributes.start) + 100 + 20 * 1000).toBe(true);
    });

    test('Start/Stale', async () => {
        const geo = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                // 1hr in the future
                start: new Date(+new Date() + 60 * 60 * 1000).toISOString(),
                stale: 60 * 1000
            },
            geometry: {
                type: 'Point',
                coordinates: [1.1, 2.2]
            }
        });

        // Approx +/- 100ms + 1hr ahead of Now
        expect(+new Date(geo.raw.event._attributes.start) > +new Date() + 60 * 60 * 1000 - 100).toBe(true);
        expect(+new Date(geo.raw.event._attributes.start) < +new Date() + 60 * 60 * 1000 + 100).toBe(true);

        // Approx +/- 100ms ahead of Now
        expect(+new Date(geo.raw.event._attributes.time) > +new Date() - 100).toBe(true);
        expect(+new Date(geo.raw.event._attributes.time) < +new Date() + 100).toBe(true);

        // Approx +/- 100ms +1hr60s ahead of now
        expect(+new Date(geo.raw.event._attributes.stale) > +new Date(geo.raw.event._attributes.time) - 100 + 60 * 1000).toBe(true);
        expect(+new Date(geo.raw.event._attributes.stale) < +new Date(geo.raw.event._attributes.start) + 100 + 60 * 1000).toBe(true);
    });

    test('Icon', async () => {
        const geo = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                icon: '66f14976-4b62-4023-8edb-d8d2ebeaa336/Public Safety Air/EMS_ROTOR.png'
            },
            geometry: {
                type: 'Point',
                coordinates: [1.1, 2.2]
            }
        });

        if (!geo.raw.event.detail || !geo.raw.event.detail.remarks) {
            throw new Error('No Detail Section');
        } else {
            expect(geo.raw.event.detail['_flow-tags_']).toBeDefined();
            delete geo.raw.event.detail['_flow-tags_'];

            expect(geo.raw.event.detail).toEqual({
                contact: { _attributes: { callsign: 'UNKNOWN' } },
                usericon: { _attributes: { iconsetpath: '66f14976-4b62-4023-8edb-d8d2ebeaa336/Public Safety Air/EMS_ROTOR.png' } },
                remarks: { _attributes: {}, _text: '' }
            });
        }
    });

    test('Height Above Earth', async () => {
        expect((await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
            },
            geometry: {
                type: 'Point',
                coordinates: [1.1, 2.2]
            }
        })).raw.event.point._attributes).toEqual({
            lat: 2.2,
            lon: 1.1,
            hae: 0.0,
            ce: 9999999.0,
            le: 9999999.0
        });

        expect((await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
            },
            geometry: {
                type: 'Point',
                coordinates: [1.1, 2.2, 101]
            }
        })).raw.event.point._attributes).toEqual({
            lat: 2.2,
            lon: 1.1,
            hae: 101,
            ce: 9999999.0,
            le: 9999999.0
        });
    });

    test('Course & Speed', async () => {
        const cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                course: 260,
                speed: 120
            },
            geometry: {
                type: 'Point',
                coordinates: [1.1, 2.2]
            }
        });

        if (!cot.raw.event.detail || !cot.raw.event.detail.remarks) {
            throw new Error('No Detail Section');
        } else {
            expect(cot.raw.event.detail.track).toEqual({
                _attributes: {
                    'course': '260',
                    'speed': '120'
                }
            });
        }
    });

    test('Remarks', async () => {
        const cot = await CoTParser.from_geojson({
            type: 'Feature',
            properties: {
                course: 260,
                speed: 120,
                remarks: 'Test'
            },
            geometry: {
                type: 'Point',
                coordinates: [1.1, 2.2]
            }
        });

        if (!cot.raw.event.detail || !cot.raw.event.detail.remarks) {
            throw new Error('No Detail Section');
        } else {
            expect(cot.raw.event.detail.remarks).toEqual({
                _attributes: {},
                _text: 'Test'
            });
        }
    });
});
