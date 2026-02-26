import { CoTParser } from '../index.js';

test('CoT.is_friend', async () => {
    let cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-f-B'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_friend()).toBeTruthy();

    cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-h-B'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_friend()).toBeFalsy();
});

test('CoT.is_hostile', async () => {
    let cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-h-B'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_hostile()).toBeTruthy();

    cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-f-B'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_hostile()).toBeFalsy();
});

test('CoT.is_unknown', async () => {
    let cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-u-B'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_unknown()).toBeTruthy();

    cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-f-B'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_unknown()).toBeFalsy();
});

test('CoT.is_pending', async () => {
    let cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-p-B'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_pending()).toBeTruthy();

    cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-f-B'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_pending()).toBeFalsy();
});

test('CoT.is_assumed', async () => {
    let cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-a-B'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_assumed()).toBeTruthy();

    cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-f-B'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_assumed()).toBeFalsy();
});

test('CoT.is_neutral', async () => {
    let cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-n-B'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_neutral()).toBeTruthy();

    cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-f-B'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_neutral()).toBeFalsy();
});

test('CoT.is_suspect', async () => {
    let cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-s-B'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_suspect()).toBeTruthy();

    cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-f-B'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_suspect()).toBeFalsy();
});

test('CoT.is_joker', async () => {
    let cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-j-B'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_joker()).toBeTruthy();

    cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-f-B'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_joker()).toBeFalsy();
});

test('CoT.is_faker', async () => {
    let cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-k-B'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_faker()).toBeTruthy();

    cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-f-B'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_faker()).toBeFalsy();
});

test('CoT.is_atom', async () => {
    let cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_atom()).toBeTruthy();

    cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'h'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_atom()).toBeFalsy();
});

test('CoT.is_airborne', async () => {
    let cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-f-A'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_airborne()).toBeTruthy();

    cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-h-G'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_airborne()).toBeFalsy();
});

test('CoT.is_ground', async () => {
    let cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-f-G'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_ground()).toBeTruthy();

    cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-h-A'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_ground()).toBeFalsy();
});

test('CoT.is_installation', async () => {
    let cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-f-G-I'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_installation()).toBeTruthy();

    cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-f-G'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_installation()).toBeFalsy();

    cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-h-A'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_installation()).toBeFalsy();
});

test('CoT.is_vehicle', async () => {
    let cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-f-G-E-V'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_vehicle()).toBeTruthy();

    cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-h-G-E-V'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_vehicle()).toBeTruthy();

    cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-f-G-E'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_vehicle()).toBeFalsy();
});

test('CoT.is_equipment', async () => {
    let cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-f-G-E'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_equipment()).toBeTruthy();

    cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-f-G'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_equipment()).toBeFalsy();
});

test('CoT.is_surface', async () => {
    let cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-f-S'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_surface()).toBeTruthy();

    cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-f-G'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_surface()).toBeFalsy();
});

test('CoT.is_subsurface', async () => {
    let cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-f-U'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_subsurface()).toBeTruthy();

    cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-f-G'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_subsurface()).toBeFalsy();
});

test('CoT.is_uav', async () => {
    const cot = await CoTParser.from_geojson({
        type: 'Feature',
        properties: {
            type: 'a-f-A-M-F-Q-r'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    });

    expect(cot.is_uav()).toBeTruthy();
});
